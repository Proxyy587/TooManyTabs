import { describe, expect, it } from "vitest"
import {
  applyFilters,
  buildItems,
  duplicateTabsToClose,
  EMPTY_FILTERS,
  facetCounts,
  groupByCategory,
  normalizeUrl,
  DAY_MS,
} from "../src/lib/items"
import { CATEGORIES } from "../src/lib/categories"

const now = Date.UTC(2026, 10, 25)

function fixture() {
  return buildItems({
    now,
    staleDays: 3,
    rules: {},
    tabs: [
      { id: 1, url: "https://github.com/a/b", title: "repo", lastAccessed: now - 1000, active: true },
      { id: 2, url: "https://github.com/a/b#readme", title: "repo again", lastAccessed: now - 5 * DAY_MS },
      { id: 3, url: "https://www.youtube.com/watch?v=1", title: "video", lastAccessed: now - 4 * DAY_MS },
      { id: 4, url: "https://react.dev/learn", title: "Learn", lastAccessed: now - 1000 },
      { id: 5, url: "chrome://settings", title: "settings" },
    ],
    groups: [
      { id: "g1", name: "Later", tabs: [{ url: "https://react.dev/learn/", title: "Learn React" }] },
      { id: "g2", name: "Gone", deleted: true, tabs: [{ url: "https://x.com", title: "x" }] },
    ],
    bookmarks: [{ id: "b1", url: "https://www.amazon.com/dp/1", title: "thing", folder: "Wishlist" }],
  })
}

describe("normalizeUrl", () => {
  it("keeps path case but ignores host case, www, hash, tracking params and trailing slash", () => {
    expect(normalizeUrl("https://WWW.Example.com/Path/?utm_source=x#top")).toBe("https://example.com/Path")
    expect(normalizeUrl("https://example.com/Path")).not.toBe(normalizeUrl("https://example.com/path"))
    expect(normalizeUrl("https://example.com/?q=1&utm_medium=y")).toBe("https://example.com/?q=1")
  })
})

describe("buildItems", () => {
  it("skips internal pages and deleted shelves", () => {
    const items = fixture()
    expect(items.map((i) => i.key)).toEqual(["open:1", "open:2", "open:3", "open:4", "saved:g1:0", "bm:b1"])
  })
  it("flags twins, dusty and already-kept open tabs", () => {
    const by = Object.fromEntries(fixture().map((i) => [i.key, i]))
    expect(by["open:1"].dupe && by["open:2"].dupe).toBe(true)
    expect(by["open:1"].stale).toBe(false) // active
    expect(by["open:2"].stale).toBe(true)
    expect(by["open:3"].stale).toBe(true)
    expect(by["open:4"].kept).toBe(true) // saved in Later (trailing slash differs)
    expect(by["open:4"].dupe).toBe(false)
  })
})

describe("filters", () => {
  it("combine across facets with AND, within categories with OR", () => {
    const items = fixture()
    const f = { ...EMPTY_FILTERS, sources: ["open" as const], categories: ["dev" as const, "video" as const], flags: ["stale" as const] }
    expect(applyFilters(items, f).map((i) => i.key)).toEqual(["open:2", "open:3"])
    const q = { ...EMPTY_FILTERS, query: "learn react" }
    expect(applyFilters(items, q).map((i) => i.key)).toEqual(["open:4", "saved:g1:0"])
  })
  it("counts each facet against the others", () => {
    const items = fixture()
    const c = facetCounts(items, { ...EMPTY_FILTERS, categories: ["dev"] })
    expect(c.sources).toEqual({ open: 2 })
    expect(c.categories.dev).toBe(2)
    expect(c.categories.shopping).toBe(1)
    expect(c.flags).toEqual({ dupes: 2, stale: 1, kept: 0 })
  })
  it("groups by category, biggest first, Other last", () => {
    const groups = groupByCategory(fixture(), CATEGORIES.map((c) => c.id))
    expect(groups.map((g) => g.category)).toEqual(["dev", "docs", "video", "shopping"])
    expect(groups[1].items.map((i) => i.source)).toEqual(["open", "saved"])
  })
  it("closes all but the active copy of a duplicated page", () => {
    expect(duplicateTabsToClose(fixture())).toEqual([2])
  })
})
