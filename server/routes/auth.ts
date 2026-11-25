import { Router } from "express";
import type { Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, devices } from "../db/schema.js";
import {
  signAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from "../lib/jwt.js";
import {
  GoogleAuthError,
  identityFromAccessToken,
  identityFromCode,
  type GoogleIdentity,
} from "../lib/google.js";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

type AuthSession = {
  token: string;
  refreshToken: string;
  deviceId: string;
  user: {
    id: number;
    email: string;
    name?: string;
    picture?: string;
  };
};

function str(v: unknown, max = 4096): string | undefined {
  return typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined;
}

async function upsertUser(identity: GoogleIdentity) {
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
): Promise<AuthSession> {
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

  if (!device) throw new Error("Failed to register device");

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

// POST /auth/google
//   { accessToken }                         ← chrome.identity.getAuthToken (Chrome Extension client)
//   { code, codeVerifier, redirectUri }     ← chrome.identity.launchWebAuthFlow (Web client, PKCE)
router.post("/google", async (req, res: Response) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const accessToken = str(body.accessToken);
  const code = str(body.code);
  const codeVerifier = str(body.codeVerifier, 256);
  const redirectUri = str(body.redirectUri, 256);
  const deviceName = str(body.deviceName, 255);
  const platform = str(body.platform, 50);

  try {
    let identity: GoogleIdentity;
    if (accessToken) {
      identity = await identityFromAccessToken(accessToken);
    } else if (code && redirectUri) {
      identity = await identityFromCode({ code, codeVerifier, redirectUri });
    } else {
      return res.status(400).json({ message: "Send accessToken, or code + codeVerifier + redirectUri." });
    }

    const user = await upsertUser(identity);
    if (!user) return res.status(500).json({ message: "Failed to create or update user" });

    const session = await issueSession(user, deviceName, platform);
    res.json(session);
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("[auth/google]", error);
    res.status(500).json({ message: "Sign-in failed on the server. Check the server log." });
  }
});

router.post("/refresh", async (req, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) return res.status(400).json({ message: "refreshToken is required" });

    const tokenHash = hashRefreshToken(refreshToken);
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.refreshTokenHash, tokenHash))
      .limit(1);

    if (!device) return res.status(401).json({ message: "Invalid refresh token" });

    const [user] = await db.select().from(users).where(eq(users.id, device.userId)).limit(1);
    if (!user) return res.status(401).json({ message: "User not found" });

    await db.update(devices).set({ lastSeenAt: new Date() }).where(eq(devices.id, device.id));

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
    if (req.deviceId) await db.delete(devices).where(eq(devices.id, req.deviceId));
    res.json({ success: true });
  } catch (error) {
    console.error("[auth/logout]", error);
    res.status(500).json({ message: "Failed to logout" });
  }
});

export default router;
