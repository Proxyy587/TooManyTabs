import { describe, expect, it } from "vitest"
import { classify, hostChain } from "../src/lib/categories"

const cat = (url: string, title = "", rules = {}) => classify(url, title, rules).category

describe("classify", () => {
  it.each([
    ["https://github.com/facebook/react/pull/1", "dev"],
    ["http://localhost:5173/", "dev"],
    ["https://my-app.test/login", "dev"],
    ["https://developer.mozilla.org/en-US/docs/Web", "docs"],
    ["https://docs.python.org/3/library/", "docs"],
    ["https://en.wikipedia.org/wiki/Tab", "docs"],
    ["https://docs.google.com/document/d/1", "work"],
    ["https://mail.google.com/mail/u/0/", "work"],
    ["https://claude.ai/new", "ai"],
    ["https://www.youtube.com/watch?v=x", "video"],
    ["https://music.youtube.com/watch?v=x", "music"],
    ["https://open.spotify.com/track/1", "music"],
    ["https://x.com/someone", "social"],
    ["https://old.reddit.com/r/chrome", "social"],
    ["https://news.ycombinator.com/item?id=1", "news"],
    ["https://www.theverge.com/2026/1/1/x", "news"],
    ["https://someone.substack.com/p/post", "reading"],
    ["https://www.amazon.in/dp/B000", "shopping"],
    ["https://www.apple.com/shop/buy-mac", "shopping"],
    ["https://www.apple.com/macbook-air/", "other"],
  ])("%s → %s", (url, expected) => {
    expect(cat(url)).toBe(expected)
  })

  it("uses subdomain, path and title hints for unknown sites", () => {
    expect(cat("https://docs.example.dev/start")).toBe("docs")
    expect(cat("https://example.com/blog/hello")).toBe("reading")
    expect(cat("https://example.com/cart")).toBe("shopping")
    expect(cat("https://example.com/x", "Why tabs matter · 6 min read")).toBe("reading")
    expect(classify("https://example.com/x").via).toBe("fallback")
  })

  it("lets user rules win and cover subdomains", () => {
    const rules = { "example.com": "work" as const }
    expect(cat("https://app.example.com/", "", rules)).toBe("work")
    expect(classify("https://youtube.com/watch", "", { "youtube.com": "docs" }).via).toBe("custom")
  })

  it("never throws on junk", () => {
    expect(cat("not a url")).toBe("other")
    expect(cat("chrome://extensions")).toBe("other")
  })

  it("walks the host chain most-specific first", () => {
    expect(hostChain("a.b.example.com")).toEqual(["a.b.example.com", "b.example.com", "example.com"])
  })
})
