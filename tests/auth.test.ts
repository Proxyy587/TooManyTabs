import { describe, expect, it } from "vitest"
import { buildAuthUrl, parseRedirect } from "../src/lib/auth"

describe("web auth flow helpers", () => {
  it("builds a PKCE code request for the chromiumapp redirect", () => {
    const url = new URL(
      buildAuthUrl({ clientId: "1-a.apps.googleusercontent.com", redirectUri: "https://abc.chromiumapp.org/", state: "s1", codeChallenge: "c" })
    )
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth")
    expect(url.searchParams.get("response_type")).toBe("code")
    expect(url.searchParams.get("code_challenge_method")).toBe("S256")
    expect(url.searchParams.get("redirect_uri")).toBe("https://abc.chromiumapp.org/")
    expect(url.searchParams.get("scope")).toBe("openid email profile")
  })
  it("returns the code only when state matches", () => {
    expect(parseRedirect("https://abc.chromiumapp.org/?state=s1&code=4%2Fxyz", "s1")).toBe("4/xyz")
    expect(() => parseRedirect("https://abc.chromiumapp.org/?state=evil&code=x", "s1")).toThrow(/didn't match/)
    expect(() => parseRedirect("https://abc.chromiumapp.org/?error=access_denied&state=s1", "s1")).toThrow()
  })
})
