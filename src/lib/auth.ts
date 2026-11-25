/**
 * Google sign-in for the extension page.
 *
 * Two paths, tried in order:
 *  1. chrome.identity.getAuthToken — needs a *Chrome Extension* OAuth client
 *     (manifest oauth2.client_id). Only works in Google Chrome signed into a
 *     Google profile. Fast, no popup when already granted.
 *  2. chrome.identity.launchWebAuthFlow — needs a *Web application* OAuth client
 *     with redirect URI https://<extension-id>.chromiumapp.org/ . Works in
 *     Chrome, Brave, Arc, Edge and other Chromium browsers. Uses the
 *     authorization-code flow with PKCE; the server exchanges the code.
 *
 * Both paths end at the background worker, which calls POST /auth/google and
 * stores our own JWT session.
 */

declare const __GOOGLE_WEB_CLIENT_ID__: string

export type AuthUser = {
  id: number
  email: string
  name?: string
  picture?: string
}

export type LoginResult = {
  token: string
  refreshToken: string
  deviceId: string
  user: AuthUser
}

export type LoginPayload =
  | { accessToken: string }
  | { code: string; codeVerifier: string; redirectUri: string }

const PLACEHOLDER = "INJECTED_FROM_ENV_AT_BUILD"

export function webClientId(): string {
  try {
    return (__GOOGLE_WEB_CLIENT_ID__ || "").trim()
  } catch {
    return ""
  }
}

export function extensionClientId(): string {
  try {
    const id = chrome.runtime.getManifest().oauth2?.client_id || ""
    return id.includes(PLACEHOLDER) ? "" : id
  } catch {
    return ""
  }
}

/** Brave exposes navigator.brave; it ships getAuthToken but it never works there. */
export function isGoogleChrome(): boolean {
  const nav = navigator as Navigator & {
    brave?: unknown
    userAgentData?: { brands?: { brand: string }[] }
  }
  if (nav.brave) return false
  const brands = nav.userAgentData?.brands?.map((b) => b.brand) ?? []
  if (brands.length) return brands.includes("Google Chrome")
  return /Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\/|Vivaldi/.test(navigator.userAgent)
}

export type AuthAvailability = {
  extensionClient: boolean
  webClient: boolean
  chrome: boolean
  /** Which path will be tried first, or null when sign-in is not configured. */
  primary: "getAuthToken" | "webAuthFlow" | null
}

export function authAvailability(): AuthAvailability {
  const extensionClient = Boolean(extensionClientId())
  const webClient = Boolean(webClientId())
  const chromeBrowser = isGoogleChrome()
  let primary: AuthAvailability["primary"] = null
  if (extensionClient && chromeBrowser) primary = "getAuthToken"
  else if (webClient) primary = "webAuthFlow"
  else if (extensionClient) primary = "getAuthToken"
  return { extensionClient, webClient, chrome: chromeBrowser, primary }
}

export class AuthError extends Error {
  readonly kind: "cancelled" | "config" | "browser" | "server" | "unknown"
  constructor(kind: AuthError["kind"], message: string) {
    super(message)
    this.kind = kind
  }
}

function redirectUri(): string {
  return chrome.identity.getRedirectURL()
}

function explainGetAuthToken(raw: string): AuthError {
  if (/did not approve|canceled|cancelled|closed/i.test(raw)) {
    return new AuthError("cancelled", "Sign-in cancelled. Nothing changed.")
  }
  if (/not supported|turned off browser signin|Custom URI scheme/i.test(raw)) {
    return new AuthError(
      "browser",
      "This browser can't use Chrome's built-in Google sign-in."
    )
  }
  if (/bad client|invalid_client|OAuth2 request failed|access.?blocked|invalid.?request/i.test(raw)) {
    return new AuthError(
      "config",
      `Google rejected the Chrome Extension client. Check that its Item ID is ${chrome.runtime.id} and your account is a Test user (see AUTH.md).`
    )
  }
  return new AuthError("unknown", raw || "Google sign-in failed.")
}

function explainWebFlow(raw: string): AuthError {
  if (/did not approve|canceled|cancelled|closed by the user/i.test(raw)) {
    return new AuthError("cancelled", "Sign-in cancelled. Nothing changed.")
  }
  if (/could not be loaded|redirect_uri|invalid_client|access_denied|unauthorized/i.test(raw)) {
    return new AuthError(
      "config",
      `Google refused the sign-in page. Add ${redirectUri()} as an authorized redirect URI on the Web OAuth client, and add your account as a Test user (see AUTH.md).`
    )
  }
  return new AuthError("unknown", raw || "Google sign-in failed.")
}

function getAuthTokenInteractive(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      chrome.identity.getAuthToken({ interactive: true }, (result) => {
        const err = chrome.runtime.lastError
        const token = typeof result === "string" ? result : result?.token
        if (err || !token) {
          reject(explainGetAuthToken(err?.message || "Google did not return a token"))
          return
        }
        resolve(token)
      })
    } catch (e) {
      reject(explainGetAuthToken(e instanceof Error ? e.message : String(e)))
    }
  })
}

function base64url(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function randomString(byteLength = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(byteLength)))
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

/** Exported for tests: builds the Google authorization URL. */
export function buildAuthUrl(opts: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
}): string {
  const p = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    access_type: "online",
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`
}

/** Exported for tests: pulls the code out of the chromiumapp.org redirect. */
export function parseRedirect(url: string, expectedState: string): string {
  const u = new URL(url)
  const error = u.searchParams.get("error")
  if (error) throw explainWebFlow(error)
  if (u.searchParams.get("state") !== expectedState) {
    throw new AuthError("unknown", "Sign-in response didn't match this request. Try again.")
  }
  const code = u.searchParams.get("code")
  if (!code) throw new AuthError("unknown", "Google didn't return an authorization code.")
  return code
}

async function webAuthFlow(): Promise<LoginPayload> {
  const clientId = webClientId()
  if (!clientId) {
    throw new AuthError("config", "No Web OAuth client is configured for this build (GOOGLE_WEB_CLIENT_ID).")
  }
  const verifier = randomString(48)
  const state = randomString(16)
  const uri = redirectUri()
  const url = buildAuthUrl({
    clientId,
    redirectUri: uri,
    state,
    codeChallenge: await pkceChallenge(verifier),
  })
  let responseUrl: string | undefined
  try {
    responseUrl = await chrome.identity.launchWebAuthFlow({ url, interactive: true })
  } catch (e) {
    throw explainWebFlow(e instanceof Error ? e.message : String(e))
  }
  if (!responseUrl) throw new AuthError("cancelled", "Sign-in cancelled. Nothing changed.")
  return { code: parseRedirect(responseUrl, state), codeVerifier: verifier, redirectUri: uri }
}

/**
 * Get proof of a Google identity from whichever path works in this browser.
 * Falls back from getAuthToken to the web flow on anything except a user cancel.
 */
export async function obtainGoogleCredential(): Promise<LoginPayload> {
  const a = authAvailability()
  if (!a.primary) {
    throw new AuthError(
      "config",
      "Google sign-in isn't configured in this build. Set GOOGLE_EXTENSION_CLIENT_ID and/or GOOGLE_WEB_CLIENT_ID in .env and rebuild (see AUTH.md)."
    )
  }
  if (a.primary === "getAuthToken") {
    try {
      return { accessToken: await getAuthTokenInteractive() }
    } catch (e) {
      if (e instanceof AuthError && e.kind === "cancelled") throw e
      if (!a.webClient) {
        if (e instanceof AuthError && e.kind === "browser") {
          throw new AuthError(
            "browser",
            "This browser can't use Chrome's built-in Google sign-in, and no Web OAuth client is configured. Use Google Chrome, or set GOOGLE_WEB_CLIENT_ID (see AUTH.md)."
          )
        }
        throw e
      }
    }
  }
  return webAuthFlow()
}

export async function revokeCachedGoogleToken(token?: string | null): Promise<void> {
  if (!token) return
  try {
    await chrome.identity.removeCachedAuthToken({ token })
  } catch {
    /* not available outside Chrome */
  }
}
