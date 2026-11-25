import { OAuth2Client } from "google-auth-library";

/**
 * Google identity verification for the extension.
 *
 * Two client types are involved (see AUTH.md):
 *  - Chrome Extension client  (GOOGLE_EXTENSION_CLIENT_ID): the extension calls
 *    chrome.identity.getAuthToken and sends us an *access token*.
 *  - Web application client   (GOOGLE_WEB_CLIENT_ID + GOOGLE_WEB_CLIENT_SECRET):
 *    the extension runs launchWebAuthFlow (PKCE) and sends us an *authorization
 *    code*, which only the server can exchange because it needs the secret.
 *
 * Legacy names are still read: GOOGLE_CLIENT_ID (treated as an allowed client)
 * and GOOGLE_CLIENT_SECRET (treated as the web secret).
 */

export type GoogleIdentity = { sub: string; email: string; name?: string; picture?: string };

export class GoogleAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const CHROMIUMAPP_REDIRECT = /^https:\/\/[a-p]{32}\.chromiumapp\.org\/$/;

function clean(v: string | undefined): string {
  return (v || "").trim();
}

export function googleConfig() {
  const extensionClientId = clean(process.env.GOOGLE_EXTENSION_CLIENT_ID);
  const legacyClientId = clean(process.env.GOOGLE_CLIENT_ID);
  const webClientId = clean(process.env.GOOGLE_WEB_CLIENT_ID);
  const webClientSecret =
    clean(process.env.GOOGLE_WEB_CLIENT_SECRET) || clean(process.env.GOOGLE_CLIENT_SECRET);
  const allowedExtensionIds = clean(process.env.ALLOWED_EXTENSION_IDS)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const audiences = [extensionClientId, legacyClientId, webClientId].filter(Boolean);
  return {
    extensionClientId,
    webClientId,
    webClientSecret,
    audiences: [...new Set(audiences)],
    allowedExtensionIds,
    accessTokenLogin: audiences.length > 0,
    codeLogin: Boolean(webClientId && webClientSecret),
  };
}

type TokenInfo = {
  aud?: string;
  azp?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  expires_in?: string | number;
  error_description?: string;
};

/**
 * Verify a Google access token AND that it was issued to one of our clients.
 * Without the audience check, any app's access token with the email scope
 * could be replayed here to sign in as that user.
 */
export async function identityFromAccessToken(
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<GoogleIdentity> {
  const cfg = googleConfig();
  if (!cfg.accessTokenLogin) {
    throw new GoogleAuthError(503, "Server has no Google client configured (GOOGLE_EXTENSION_CLIENT_ID).");
  }
  const infoRes = await fetchImpl(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!infoRes.ok) throw new GoogleAuthError(401, "Google access token is invalid or expired.");
  const info = (await infoRes.json()) as TokenInfo;
  const audience = info.aud || info.azp || "";
  if (!cfg.audiences.includes(audience)) {
    throw new GoogleAuthError(401, "Google token was issued to a different app.");
  }

  const userRes = await fetchImpl("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) throw new GoogleAuthError(401, "Couldn't read your Google profile.");
  const user = (await userRes.json()) as {
    id?: string;
    email?: string;
    verified_email?: boolean;
    name?: string;
    picture?: string;
  };
  if (!user.id || !user.email) throw new GoogleAuthError(401, "Google profile is missing an email.");
  if (user.verified_email === false) throw new GoogleAuthError(401, "Google email is not verified.");
  if (info.sub && info.sub !== user.id) throw new GoogleAuthError(401, "Google token mismatch.");
  return { sub: user.id, email: user.email, name: user.name, picture: user.picture };
}

/** Exported for tests. */
export function assertRedirectUri(redirectUri: string) {
  if (!CHROMIUMAPP_REDIRECT.test(redirectUri)) {
    throw new GoogleAuthError(400, "redirectUri must be https://<extension-id>.chromiumapp.org/");
  }
  const { allowedExtensionIds } = googleConfig();
  if (allowedExtensionIds.length) {
    const id = redirectUri.slice("https://".length, "https://".length + 32);
    if (!allowedExtensionIds.includes(id)) {
      throw new GoogleAuthError(400, "This extension ID is not allowed to sign in here.");
    }
  }
}

/** Exchange a launchWebAuthFlow authorization code (PKCE) for a verified identity. */
export async function identityFromCode(body: {
  code: string;
  codeVerifier?: string;
  redirectUri: string;
}): Promise<GoogleIdentity> {
  const cfg = googleConfig();
  if (!cfg.codeLogin) {
    throw new GoogleAuthError(
      503,
      "Server can't finish web sign-in: set GOOGLE_WEB_CLIENT_ID and GOOGLE_WEB_CLIENT_SECRET in server/.env."
    );
  }
  assertRedirectUri(body.redirectUri);
  const client = new OAuth2Client(cfg.webClientId, cfg.webClientSecret, body.redirectUri);
  let idToken: string | null | undefined;
  try {
    const { tokens } = await client.getToken({ code: body.code, codeVerifier: body.codeVerifier });
    idToken = tokens.id_token;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new GoogleAuthError(401, `Google rejected the sign-in code (${detail}).`);
  }
  if (!idToken) throw new GoogleAuthError(401, "Google did not return an ID token.");
  const ticket = await client.verifyIdToken({ idToken, audience: cfg.webClientId });
  const p = ticket.getPayload();
  if (!p?.sub || !p.email) throw new GoogleAuthError(401, "Google ID token is missing an email.");
  if (p.email_verified === false) throw new GoogleAuthError(401, "Google email is not verified.");
  return { sub: p.sub, email: p.email, name: p.name, picture: p.picture };
}
