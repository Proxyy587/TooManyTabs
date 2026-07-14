import { Router } from "express";
import type { Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, devices } from "../db/schema.js";
import {
  signAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from "../lib/jwt.js";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

async function verifyGoogleIdentity(body: {
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
  idToken?: string;
  accessToken?: string;
}): Promise<{ sub: string; email: string; name?: string; picture?: string }> {
  // Preferred: authorization code + PKCE (works with modern Google OAuth)
  if (body.code) {
    if (!body.redirectUri || !body.codeVerifier) {
      throw new Error("code, codeVerifier, and redirectUri are required");
    }
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error(
        "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set on the server"
      );
    }

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      body.redirectUri
    );

    const { tokens } = await client.getToken({
      code: body.code,
      codeVerifier: body.codeVerifier,
    });

    if (tokens.id_token) {
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        throw new Error("Invalid id_token payload");
      }
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    }

    if (tokens.access_token) {
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (!userInfoResponse.ok) throw new Error("Invalid access token from code exchange");
      const userInfo = (await userInfoResponse.json()) as {
        id: string;
        email: string;
        name?: string;
        picture?: string;
      };
      if (!userInfo.id || !userInfo.email) throw new Error("Invalid userinfo response");
      return {
        sub: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      };
    }

    throw new Error("Google did not return tokens for this authorization code");
  }

  if (body.idToken) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: body.idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error("Invalid id_token payload");
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  }

  if (body.accessToken) {
    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${body.accessToken}`
    );
    if (!userInfoResponse.ok) {
      throw new Error("Invalid access token");
    }
    const userInfo = (await userInfoResponse.json()) as {
      id: string;
      email: string;
      name?: string;
      picture?: string;
    };
    if (!userInfo.id || !userInfo.email) {
      throw new Error("Invalid userinfo response");
    }
    return {
      sub: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    };
  }

  throw new Error("Authorization code, idToken, or accessToken is required");
}

async function upsertUser(identity: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.googleId, identity.sub))
    .limit(1);

  if (existing.length === 0) {
    const [created] = await db
      .insert(users)
      .values({
        googleId: identity.sub,
        email: identity.email,
        name: identity.name || null,
        picture: identity.picture || null,
      })
      .returning();
    return created;
  }

  const [updated] = await db
    .update(users)
    .set({
      name: identity.name || existing[0]?.name || null,
      picture: identity.picture || existing[0]?.picture || null,
      updatedAt: new Date(),
    })
    .where(eq(users.googleId, identity.sub))
    .returning();

  return updated;
}

async function issueSession(
  user: { id: number; email: string; name: string | null; picture: string | null },
  deviceName?: string,
  platform?: string
) {
  const refreshToken = createRefreshToken();
  const [device] = await db
    .insert(devices)
    .values({
      userId: user.id,
      name: deviceName || "Unknown device",
      platform: platform || "chrome",
      refreshTokenHash: hashRefreshToken(refreshToken),
      lastSeenAt: new Date(),
    })
    .returning();

  if (!device) {
    throw new Error("Failed to register device");
  }

  const token = signAccessToken({
    userId: String(user.id),
    email: user.email,
    deviceId: device.id,
  });

  return {
    token,
    refreshToken,
    deviceId: device.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      picture: user.picture || undefined,
    },
  };
}

// POST /auth/google — code+PKCE (preferred), idToken, or accessToken
router.post("/google", async (req, res: Response) => {
  try {
    const { code, codeVerifier, redirectUri, idToken, accessToken, deviceName, platform } =
      req.body as {
        code?: string;
        codeVerifier?: string;
        redirectUri?: string;
        idToken?: string;
        accessToken?: string;
        deviceName?: string;
        platform?: string;
      };

    const identity = await verifyGoogleIdentity({
      code,
      codeVerifier,
      redirectUri,
      idToken,
      accessToken,
    });
    const user = await upsertUser(identity);

    if (!user) {
      return res.status(500).json({ message: "Failed to create or update user" });
    }

    const session = await issueSession(user, deviceName, platform);
    res.json(session);
  } catch (error) {
    console.error("[auth/google]", error);
    const message = error instanceof Error ? error.message : "Authentication failed";
    const status =
      message.includes("token") ||
      message.includes("required") ||
      message.includes("code") ||
      message.includes("Invalid")
        ? 401
        : 500;
    res.status(status).json({ message });
  }
});

router.post("/refresh", async (req, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.refreshTokenHash, tokenHash))
      .limit(1);

    if (!device) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, device.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    await db
      .update(devices)
      .set({ lastSeenAt: new Date() })
      .where(eq(devices.id, device.id));

    const token = signAccessToken({
      userId: String(user.id),
      email: user.email,
      deviceId: device.id,
    });

    res.json({ token, deviceId: device.id });
  } catch (error) {
    console.error("[auth/refresh]", error);
    res.status(500).json({ message: "Failed to refresh token" });
  }
});

router.post("/logout", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.deviceId) {
      await db.delete(devices).where(eq(devices.id, req.deviceId));
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[auth/logout]", error);
    res.status(500).json({ message: "Failed to logout" });
  }
});

export default router;
