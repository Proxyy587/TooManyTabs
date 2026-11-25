/**
 * One model for everything on the page: open tabs, saved tabs (shelves) and
 * bookmarks. Filters work on this list, so every filter combines with every
 * other one.
 */
import { CATEGORIES, classify, hostOf, type CategoryKey, type CategoryRules, type CustomCategory } from "./categories"

export type Source = "open" | "saved" | "bookmark"
export const SOURCES: { id: Source; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "saved", label: "Saved" },
  { id: "bookmark", label: "Bookmarks" },
]

export type Item = {
  key: string
  source: Source
  url: string
  title: string
  favIconUrl?: string | null
  host: string
  category: CategoryKey
  categoryVia: string
  norm: string
  // open tabs
  tabId?: number
  windowId?: number
  lastAccessed?: number
  active?: boolean
  pinned?: boolean
  audible?: boolean
  discarded?: boolean
  // saved tabs
  groupId?: string
  groupName?: string
  index?: number
  // bookmarks
  bookmarkId?: string
  folder?: string
  // derived
  dupe?: boolean
  stale?: boolean
  /** open tab whose URL is also saved or bookmarked: safe to close */
  kept?: boolean
}

export type RawTab = {
  id?: number
  windowId?: number
  url?: string
  title?: string
  favIconUrl?: string
  lastAccessed?: number
  active?: boolean
  pinned?: boolean
  audible?: boolean
  discarded?: boolean
}

export type RawGroup = {
  id: string
  name: string
  tabs: { url: string; title: string; favIconUrl?: string | null }[]
  deleted?: boolean
}

export type RawBookmark = { id: string; url: string; title: string; folder: string; dateAdded?: number }

const INTERNAL = /^(chrome|chrome-extension|edge|brave|about|devtools|view-source|chrome-search|arc|vivaldi|opera):/i

export function isListableUrl(url?: string): url is string {
  return !!url && !INTERNAL.test(url)
}

/**
 * Canonical form for duplicate detection: lowercase scheme+host, drop www.,
 * the #hash, tracking params and a trailing slash. Path and query keep their
 * case (they are case-sensitive on most servers).
 */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ""
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_eid$|ref_src$|si$)/i.test(k)) u.searchParams.delete(k)
    }
    let path = u.pathname
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1)
    const host = u.host.toLowerCase().replace(/^www\./, "")
    const q = u.searchParams.toString()
    return `${u.protocol.toLowerCase()}//${host}${path}${q ? `?${q}` : ""}`
  } catch {
    return url.trim()
  }
}

export const DAY_MS = 24 * 60 * 60 * 1000

export function buildItems(input: {
  tabs: RawTab[]
  groups: RawGroup[]
  bookmarks: RawBookmark[]
  rules: CategoryRules
  custom?: CustomCategory[]
  staleDays: number
  now: number
}): Item[] {
  const { rules, now } = input
  const custom = input.custom ?? []
  const items: Item[] = []
  const base = (url: string, title: string) => {
    const c = classify(url, title, rules, custom)
    return { url, title: title || hostOf(url) || url, host: hostOf(url), category: c.category, categoryVia: c.via, norm: normalizeUrl(url) }
  }

  for (const t of input.tabs) {
    if (t.id == null || !isListableUrl(t.url)) continue
    items.push({
      key: `open:${t.id}`,
      source: "open",
      ...base(t.url, t.title || ""),
      favIconUrl: t.favIconUrl,
      tabId: t.id,
      windowId: t.windowId,
      lastAccessed: t.lastAccessed,
      active: t.active,
      pinned: t.pinned,
      audible: t.audible,
      discarded: t.discarded,
    })
  }
  for (const g of input.groups) {
    if (g.deleted) continue
    g.tabs.forEach((t, index) => {
      if (!t.url) return
      items.push({
        key: `saved:${g.id}:${index}`,
        source: "saved",
        ...base(t.url, t.title),
        favIconUrl: t.favIconUrl,
        groupId: g.id,
        groupName: g.name,
        index,
      })
    })
  }
  for (const b of input.bookmarks) {
    if (!isListableUrl(b.url)) continue
    items.push({ key: `bm:${b.id}`, source: "bookmark", ...base(b.url, b.title), bookmarkId: b.id, folder: b.folder })
  }

  // derived flags for open tabs
  const openCounts = new Map<string, number>()
  const keptUrls = new Set<string>()
  for (const it of items) {
    if (it.source === "open") openCounts.set(it.norm, (openCounts.get(it.norm) || 0) + 1)
    else keptUrls.add(it.norm)
  }
  const staleBefore = now - input.staleDays * DAY_MS
  for (const it of items) {
    if (it.source !== "open") continue
    it.dupe = (openCounts.get(it.norm) || 0) > 1
    it.kept = keptUrls.has(it.norm)
    it.stale = !it.active && !it.pinned && !it.audible && typeof it.lastAccessed === "number" && it.lastAccessed < staleBefore
  }
  return items
}

// ---------------------------------------------------------------- filters

export type Flag = "dupes" | "stale" | "kept"
export const FLAGS: { id: Flag; label: string; hint: string }[] = [
  { id: "dupes", label: "Twins", hint: "Open tabs with the same page open more than once" },
  { id: "stale", label: "Dusty", hint: "Open tabs you haven't looked at in a while" },
  { id: "kept", label: "Safe to close", hint: "Open tabs that are also saved or bookmarked, so they're safe to close" },
]

export type Filters = {
  sources: Source[]
  categories: CategoryKey[]
  flags: Flag[]
  shelf: string | null
  query: string
}

export const EMPTY_FILTERS: Filters = { sources: [], categories: [], flags: [], shelf: null, query: "" }

export function isFiltering(f: Filters): boolean {
  return f.sources.length > 0 || f.categories.length > 0 || f.flags.length > 0 || !!f.shelf || f.query.trim() !== ""
}

function matchesQuery(it: Item, terms: string[]): boolean {
  if (!terms.length) return true
  const hay = `${it.title} ${it.url} ${it.groupName || ""} ${it.folder || ""}`.toLowerCase()
  return terms.every((t) => hay.includes(t))
}

export function queryTerms(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean)
}

type Facet = "sources" | "categories" | "flags" | "shelf" | "query"

/**
 * Facets combine with AND; values inside one facet combine with OR
 * (Code OR Docs), except flags, which all must hold (Dusty AND Twins).
 * Pass `skip` to compute counts for a facet as if it were unset.
 */
export function matches(it: Item, f: Filters, skip?: Facet, terms = queryTerms(f.query)): boolean {
  if (skip !== "sources" && f.sources.length && !f.sources.includes(it.source)) return false
  if (skip !== "categories" && f.categories.length && !f.categories.includes(it.category)) return false
  if (skip !== "shelf" && f.shelf && it.groupId !== f.shelf) return false
  if (skip !== "flags" && f.flags.length) {
    if (it.source !== "open") return false
    for (const flag of f.flags) {
      if (flag === "dupes" && !it.dupe) return false
      if (flag === "stale" && !it.stale) return false
      if (flag === "kept" && !it.kept) return false
    }
  }
  if (skip !== "query" && !matchesQuery(it, terms)) return false
  return true
}

export function applyFilters(items: Item[], f: Filters): Item[] {
  const terms = queryTerms(f.query)
  return items.filter((it) => matches(it, f, undefined, terms))
}

/** Counts for each chip, computed against every *other* active facet. */
export function facetCounts(items: Item[], f: Filters) {
  const terms = queryTerms(f.query)
  const sources: Record<string, number> = {}
  const categories: Record<string, number> = {}
  const flags: Record<string, number> = { dupes: 0, stale: 0, kept: 0 }
  for (const it of items) {
    if (matches(it, f, "sources", terms)) sources[it.source] = (sources[it.source] || 0) + 1
    if (matches(it, f, "categories", terms)) categories[it.category] = (categories[it.category] || 0) + 1
    if (it.source === "open" && matches(it, f, "flags", terms)) {
      if (it.dupe) flags.dupes++
      if (it.stale) flags.stale++
      if (it.kept) flags.kept++
    }
  }
  return { sources, categories, flags }
}

const SOURCE_ORDER: Record<Source, number> = { open: 0, saved: 1, bookmark: 2 }

/** Group into category sections, biggest first; inside, open → saved → bookmarks. */
export function groupByCategory(items: Item[], order: CategoryKey[]): { category: CategoryKey; items: Item[] }[] {
  const by = new Map<CategoryKey, Item[]>()
  for (const it of items) {
    const list = by.get(it.category)
    if (list) list.push(it)
    else by.set(it.category, [it])
  }
  const rank = new Map(order.map((c, i) => [c, i]))
  return [...by.entries()]
    .map(([category, list]) => ({
      category,
      items: list.sort(
        (a, b) =>
          SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source] ||
          (b.lastAccessed || 0) - (a.lastAccessed || 0) ||
          a.title.localeCompare(b.title)
      ),
    }))
    .sort((a, b) => {
      if (a.category === "other") return 1
      if (b.category === "other") return -1
      return b.items.length - a.items.length || (rank.get(a.category) ?? 99) - (rank.get(b.category) ?? 99)
    })
}

/** Ids of open tabs to close so that exactly one of each duplicated page stays. Keeps the active/most recent one. */
export function duplicateTabsToClose(items: Item[]): number[] {
  const byNorm = new Map<string, Item[]>()
  for (const it of items) {
    if (it.source !== "open" || it.tabId == null) continue
    const list = byNorm.get(it.norm)
    if (list) list.push(it)
    else byNorm.set(it.norm, [it])
  }
  const close: number[] = []
  for (const list of byNorm.values()) {
    if (list.length < 2) continue
    const keep = [...list].sort(
      (a, b) => Number(!!b.active) - Number(!!a.active) || Number(!!b.pinned) - Number(!!a.pinned) || (b.lastAccessed || 0) - (a.lastAccessed || 0)
    )[0]
    for (const it of list) if (it !== keep) close.push(it.tabId!)
  }
  return close
}

export function relativeAge(ts: number | undefined, now: number): string {
  if (!ts) return ""
  const d = Math.max(0, now - ts)
  const m = Math.floor(d / 60000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

// ---------------------------------------------------------------- smart categories

export type SmartCategory = { id: CategoryKey; label: string; custom: boolean; hosts: number; total: number }

/**
 * The categories worth showing as filters. A built-in category needs at least
 * two different sites, because a "category" with one site in it is just that
 * site and the search box already finds it. Your own categories always show.
 * Biggest first; "Other" never shows.
 */
export function smartCategories(items: Item[], custom: CustomCategory[] = [], minHosts = 2): SmartCategory[] {
  const hosts = new Map<CategoryKey, Set<string>>()
  const total = new Map<CategoryKey, number>()
  for (const it of items) {
    if (!hosts.has(it.category)) hosts.set(it.category, new Set())
    hosts.get(it.category)!.add(it.host)
    total.set(it.category, (total.get(it.category) || 0) + 1)
  }
  const out: SmartCategory[] = []
  for (const c of custom) out.push({ id: c.id, label: c.label, custom: true, hosts: hosts.get(c.id)?.size || 0, total: total.get(c.id) || 0 })
  for (const c of CATEGORIES) {
    if (c.id === "other") continue
    const h = hosts.get(c.id)?.size || 0
    if (h >= minHosts) out.push({ id: c.id, label: c.label, custom: false, hosts: h, total: total.get(c.id) || 0 })
  }
  return out.sort((a, b) => Number(b.custom) - Number(a.custom) || b.total - a.total || a.label.localeCompare(b.label))
}

/** Open tabs that are already saved or bookmarked: closing them loses nothing. */
export function keptTabsToClose(items: Item[]): number[] {
  return items.filter((i) => i.source === "open" && i.kept && !i.pinned && !i.active && i.tabId != null).map((i) => i.tabId!)
}

/** A shelf as a Markdown list, for pasting into notes or a message. */
export function shelfToMarkdown(name: string, items: { title: string; url: string }[]): string {
  const esc = (t: string) => t.replace(/[[\]]/g, "\\$&")
  return `## ${name}\n\n${items.map((i) => `- [${esc(i.title)}](${i.url})`).join("\n")}\n`
}
