import { describe, expect, it } from "vitest"
import { classify, cleanSite, sanitizeCustom, type CustomCategory } from "../src/lib/categories"
import { buildItems, keptTabsToClose, shelfToMarkdown, smartCategories, DAY_MS } from "../src/lib/items"

const now = Date.UTC(2026, 10, 25)
const trip: CustomCategory = { id: "c-trip01", label: "Goa trip", sites: ["skyscanner.co.in"], words: ["goa"] }

describe("custom categories", () => {
  it("match your sites (and their subdomains) and your words", () => {
    expect(classify("https://www.skyscanner.co.in/flights", "", {}, [trip]).category).toBe("c-trip01")
    expect(classify("https://m.skyscanner.co.in/x", "", {}, [trip]).category).toBe("c-trip01")
    expect(classify("https://example.com/a", "Best beaches in Goa", {}, [trip]).category).toBe("c-trip01")
    expect(classify("https://example.com/a", "Unrelated", {}, [trip]).category).toBe("other")
  })
  it("beat the built-in sites but lose to an explicit site rule", () => {
    const mine: CustomCategory = { id: "c-work02", label: "Client", sites: ["github.com"], words: [] }
    expect(classify("https://github.com/acme/app", "", {}, [mine]).category).toBe("c-work02")
    expect(classify("https://github.com/acme/app", "", { "github.com": "docs" }, [mine]).category).toBe("docs")
  })
  it("ignore a rule that points at a deleted custom category", () => {
    expect(classify("https://github.com/a", "", { "github.com": "c-gone99" }, []).category).toBe("dev")
  })
  it("are cleaned on the way in", () => {
    expect(cleanSite("https://www.GitHub.com/x/y")).toBe("github.com")
    expect(cleanSite("not a site")).toBe("")
    const clean = sanitizeCustom([
      { id: "c-ok0001", label: "  Reading list  ", sites: ["WWW.Medium.com", "nope", "medium.com"], words: ["  Long Read ", ""] },
      { id: "bad id", label: "x", sites: [], words: [] },
      { id: "c-empty1", label: "   ", sites: [], words: [] },
      "junk",
    ])
    expect(clean).toEqual([{ id: "c-ok0001", label: "Reading list", sites: ["medium.com"], words: ["long read"] }])
    expect(sanitizeCustom("nope")).toEqual([])
  })
})

describe("smartCategories", () => {
  const items = buildItems({
    now,
    staleDays: 3,
    rules: {},
    custom: [trip],
    tabs: [
      { id: 1, url: "https://github.com/a", title: "a" },
      { id: 2, url: "https://gitlab.com/b", title: "b" },
      { id: 3, url: "https://www.youtube.com/watch?v=1", title: "video 1" },
      { id: 4, url: "https://www.youtube.com/watch?v=2", title: "video 2" },
      { id: 5, url: "https://www.amazon.com/dp/1", title: "thing" },
    ],
    groups: [],
    bookmarks: [],
  })
  it("hides a built-in category that only has one site in it", () => {
    const ids = smartCategories(items, [trip]).map((c) => c.id)
    expect(ids).toContain("dev") // github + gitlab
    expect(ids).not.toContain("video") // two tabs, but one site
    expect(ids).not.toContain("shopping") // one site
    expect(ids).not.toContain("other")
  })
  it("always shows your own categories, first", () => {
    expect(smartCategories(items, [trip])[0]).toMatchObject({ id: "c-trip01", custom: true, total: 0 })
  })
})

describe("close and share helpers", () => {
  it("closes only open tabs that are already saved, never the active or pinned one", () => {
    const items = buildItems({
      now,
      staleDays: 3,
      rules: {},
      tabs: [
        { id: 1, url: "https://a.com/x", title: "a", lastAccessed: now - DAY_MS },
        { id: 2, url: "https://b.com/x", title: "b", active: true },
        { id: 3, url: "https://c.com/x", title: "c", pinned: true },
        { id: 4, url: "https://d.com/x", title: "d" },
      ],
      groups: [{ id: "g", name: "Later", tabs: ["a", "b", "c"].map((h) => ({ url: `https://${h}.com/x/`, title: h })) }],
      bookmarks: [],
    })
    expect(keptTabsToClose(items)).toEqual([1])
  })
  it("writes a shelf as Markdown", () => {
    expect(shelfToMarkdown("Later", [{ title: "A [x]", url: "https://a.com" }])).toBe("## Later\n\n- [A \\[x\\]](https://a.com)\n")
  })
})
