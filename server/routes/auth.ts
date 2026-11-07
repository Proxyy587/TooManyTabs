import { Router } from "express";
import type { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "../db/index.js";
import { users, devices } from "../db/schema.js";
import {
  signAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from "../lib/jwt.js";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const API_BASE = (process.env.API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const GOOGLE_REDIRECT_URI = `${API_BASE}/auth/google/callback`;

type PendingResult =
  | { status: "pending"; createdAt: number }
  | { status: "ready"; createdAt: number; session: AuthSession }
  | { status: "error"; createdAt: number; message: string };

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

/** In-memory login handoff between browser tab and extension (TTL 5 min) */
const pendingLogins = new Map<string, PendingResult>();
const pendingMeta = new Map<string, { platform: string; deviceName: string }>();

function prunePending() {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [key, value] of pendingLogins) {
    if (value.createdAt < cutoff) {
      pendingLogins.delete(key);
      pendingMeta.delete(key);
    }
  }
}

function requireGoogleConfig() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
}

function googleClient(redirectUri = GOOGLE_REDIRECT_URI) {
  requireGoogleConfig();
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

async function verifyGoogleIdentity(body: {
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
  idToken?: string;
  accessToken?: string;
}): Promise<{ sub: string; email: string; name?: string; picture?: string }> {
  if (body.code) {
    if (!body.redirectUri) {
      throw new Error("redirectUri is required with code");
    }
    const client = googleClient(body.redirectUri);
    const tokenOpts: { code: string; codeVerifier?: string } = { code: body.code };
    if (body.codeVerifier) tokenOpts.codeVerifier = body.codeVerifier;
    const { tokens } = await client.getToken(tokenOpts);

    if (tokens.id_token) {
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) throw new Error("Invalid id_token payload");
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
    if (!payload?.sub || !payload.email) throw new Error("Invalid id_token payload");
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  }

  if (body.accessToken) {
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${body.accessToken}` } }
    );
    if (!userInfoResponse.ok) throw new Error("Invalid access token");
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

function donePage(ok: boolean, message: string) {
  const color = ok ? "#0d9488" : "#e11d48";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>TooManyTabs</title>
<style>
  body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f6f3;color:#121212}
  .card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:2rem;max-width:360px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.06)}
  h1{font-size:1.25rem;margin:0 0 .5rem}
  p{color:#666;font-size:.9rem;margin:0}
  .dot{width:12px;height:12px;border-radius:50%;background:${color};display:inline-block;margin-bottom:1rem}
</style></head>
<body><div class="card"><div class="dot"></div><h1>${ok ? "You're signed in" : "Sign-in failed"}</h1><p>${message}</p></div>
<script>setTimeout(()=>window.close(),1400)</script>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Browser OAuth (reliable) — extension opens this, Google redirects back here
// Redirect URI to add in Google Cloud: http://localhost:3000/auth/google/callback
// ---------------------------------------------------------------------------

// GET /auth/google/start?state=&platform=&deviceName=
router.get("/google/start", (req: Request, res: Response) => {
  try {
    prunePending();
    requireGoogleConfig();
    const state =
      typeof req.query.state === "string" && req.query.state.length > 8
        ? req.query.state
        : randomBytes(16).toString("hex");

    pendingLogins.set(state, { status: "pending", createdAt: Date.now() });
    pendingMeta.set(state, {
      platform: typeof req.query.platform === "string" ? req.query.platform : "chrome",
      deviceName:
        typeof req.query.deviceName === "string"
          ? req.query.deviceName
          : "Browser extension",
    });

    const client = googleClient();
    const url = client.generateAuthUrl({
      access_type: "online",
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
      state,
      redirect_uri: GOOGLE_REDIRECT_URI,
    });

    res.redirect(url);
  } catch (error) {
    console.error("[auth/google/start]", error);
    res.status(500).send(donePage(false, error instanceof Error ? error.message : "Config error"));
  }
});

// GET /auth/google/callback?code=&state=
router.get("/google/callback", async (req: Request, res: Response) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const oauthError = typeof req.query.error === "string" ? req.query.error : "";

  if (!state || !pendingLogins.has(state)) {
    return res.status(400).send(donePage(false, "Unknown or expired login session. Try again from the extension."));
  }

  if (oauthError || !code) {
    pendingLogins.set(state, {
      status: "error",
      createdAt: Date.now(),
      message: oauthError || "No authorization code from Google",
    });
    return res.status(400).send(donePage(false, oauthError || "Google did not return a code"));
  }

  try {
    const meta = pendingMeta.get(state);

    const identity = await verifyGoogleIdentity({
      code,
      redirectUri: GOOGLE_REDIRECT_URI,
    });
    const user = await upsertUser(identity);
    if (!user) throw new Error("Failed to upsert user");

    const session = await issueSession(user, meta?.deviceName, meta?.platform);
    pendingLogins.set(state, { status: "ready", createdAt: Date.now(), session });
    pendingMeta.delete(state);

    res.send(donePage(true, "You can close this tab — TooManyTabs will finish signing you in."));
  } catch (error) {
    console.error("[auth/google/callback]", error);
    const message = error instanceof Error ? error.message : "Authentication failed";
    pendingLogins.set(state, { status: "error", createdAt: Date.now(), message });
    pendingMeta.delete(state);
    res.status(500).send(donePage(false, message));
  }
});

// GET /auth/google/result?state= — extension polls this
router.get("/google/result", (req: Request, res: Response) => {
  prunePending();
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (!state) return res.status(400).json({ status: "error", message: "state required" });

  const entry = pendingLogins.get(state);
  if (!entry) return res.status(404).json({ status: "error", message: "Unknown state" });

  if (entry.status === "pending") {
    return res.json({ status: "pending" });
  }

  if (entry.status === "error") {
    pendingLogins.delete(state);
    return res.json({ status: "error", message: entry.message });
  }

  pendingLogins.delete(state);
  return res.json({ status: "ready", ...entry.session });
});

// POST /auth/google — legacy/extension direct exchange (accessToken / code+PKCE)
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
    if (!user) return res.status(500).json({ message: "Failed to create or update user" });

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
