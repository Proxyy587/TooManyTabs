import { afterEach, describe, expect, it } from "vitest"
import { assertRedirectUri, identityFromAccessToken } from "../server/lib/google"

const env = { ...process.env }
afterEach(() => {
  process.env = { ...env }
})

function fakeFetch(aud: string): typeof fetch {
  return (async (url: string) => {
    if (String(url).includes("tokeninfo")) return new Response(JSON.stringify({ aud, azp: aud, sub: "42" }), { status: 200 })
    return new Response(JSON.stringify({ id: "42", email: "a@b.c", verified_email: true }), { status: 200 })
  }) as unknown as typeof fetch
}

describe("server google verification", () => {
  it("accepts access tokens issued to our extension client", async () => {
    process.env.GOOGLE_EXTENSION_CLIENT_ID = "1-ours.apps.googleusercontent.com"
    const who = await identityFromAccessToken("t", fakeFetch("1-ours.apps.googleusercontent.com"))
    expect(who).toMatchObject({ sub: "42", email: "a@b.c" })
  })
  it("rejects access tokens minted for another app", async () => {
    process.env.GOOGLE_EXTENSION_CLIENT_ID = "1-ours.apps.googleusercontent.com"
    await expect(identityFromAccessToken("t", fakeFetch("9-theirs.apps.googleusercontent.com"))).rejects.toThrow(/different app/)
  })
  it("only allows chromiumapp.org redirect URIs (and the allow-list when set)", () => {
    expect(() => assertRedirectUri("https://najlilhbfkkocnnhfaofffpfehcipahe.chromiumapp.org/")).not.toThrow()
    expect(() => assertRedirectUri("https://evil.example.com/")).toThrow()
    process.env.ALLOWED_EXTENSION_IDS = "najlilhbfkkocnnhfaofffpfehcipahe"
    expect(() => assertRedirectUri("https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.chromiumapp.org/")).toThrow(/not allowed/)
  })
})
