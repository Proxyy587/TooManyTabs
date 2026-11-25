/**
 * Thin, typed wrappers over chrome.tabs / chrome.windows / chrome.bookmarks
 * used by the page. All failures are swallowed into safe defaults so a missing
 * permission never blanks the page.
 */
import type { RawBookmark, RawTab } from "./items"

export async function getOpenTabs(): Promise<RawTab[]> {
  try {
    const tabs = await chrome.tabs.query({})
    return tabs.map((t) => ({
      id: t.id,
      windowId: t.windowId,
      url: t.url || t.pendingUrl,
      title: t.title,
      favIconUrl: t.favIconUrl,
      lastAccessed: (t as chrome.tabs.Tab & { lastAccessed?: number }).lastAccessed,
      active: t.active,
      pinned: t.pinned,
      audible: t.audible,
      discarded: t.discarded,
    }))
  } catch {
    return []
  }
}

export async function getBookmarks(): Promise<RawBookmark[]> {
  if (!chrome.bookmarks?.getTree) return []
  try {
    const tree = await chrome.bookmarks.getTree()
    const out: RawBookmark[] = []
    const walk = (nodes: chrome.bookmarks.BookmarkTreeNode[], trail: string[]) => {
      for (const n of nodes) {
        if (n.url) out.push({ id: n.id, url: n.url, title: n.title || n.url, folder: trail.join(" / "), dateAdded: n.dateAdded })
        if (n.children) walk(n.children, n.title ? [...trail, n.title] : trail)
      }
    }
    walk(tree, [])
    return out
  } catch {
    return []
  }
}

/** Bring an open tab (and its window) to the front. */
export async function focusTab(tabId: number, windowId?: number): Promise<void> {
  await chrome.tabs.update(tabId, { active: true })
  if (windowId != null) await chrome.windows.update(windowId, { focused: true })
}

export async function openUrls(urls: string[], opts: { newWindow?: boolean; background?: boolean } = {}): Promise<void> {
  if (!urls.length) return
  if (opts.newWindow) {
    await chrome.windows.create({ url: urls, focused: true })
    return
  }
  for (const [i, url] of urls.entries()) {
    await chrome.tabs.create({ url, active: !opts.background && i === 0 })
  }
}

export async function closeTabs(tabIds: number[]): Promise<void> {
  if (tabIds.length) await chrome.tabs.remove(tabIds)
}

/**
 * Unload tabs from memory without closing them (they reload on click).
 * Returns how many were actually discarded; active/audible tabs can't be.
 */
export async function snoozeTabs(tabIds: number[]): Promise<number> {
  let n = 0
  for (const id of tabIds) {
    try {
      const t = await chrome.tabs.discard(id)
      if (t) n++
    } catch {
      /* active or already discarded */
    }
  }
  return n
}

/** Re-run `cb` (debounced) whenever tabs or bookmarks change anywhere. */
export function watchBrowser(cb: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const fire = () => {
    clearTimeout(timer)
    timer = setTimeout(cb, 150)
  }
  const onUpdated = (_id: number, info: chrome.tabs.TabChangeInfo) => {
    if (info.url || info.title || info.status === "complete" || info.favIconUrl || info.discarded !== undefined || info.audible !== undefined || info.pinned !== undefined) fire()
  }
  const tabEvents = [chrome.tabs.onCreated, chrome.tabs.onRemoved, chrome.tabs.onActivated, chrome.tabs.onAttached, chrome.tabs.onReplaced]
  for (const e of tabEvents) (e as chrome.events.Event<() => void>).addListener(fire)
  chrome.tabs.onUpdated.addListener(onUpdated)
  const bm = chrome.bookmarks
  const bmEvents = bm ? [bm.onCreated, bm.onRemoved, bm.onChanged, bm.onMoved] : []
  for (const e of bmEvents) (e as chrome.events.Event<() => void>).addListener(fire)
  return () => {
    clearTimeout(timer)
    for (const e of tabEvents) (e as chrome.events.Event<() => void>).removeListener(fire)
    chrome.tabs.onUpdated.removeListener(onUpdated)
    for (const e of bmEvents) (e as chrome.events.Event<() => void>).removeListener(fire)
  }
}

/** Favicon via the browser's own cache (MV3 "favicon" permission); no network request to the site. */
export function faviconFor(pageUrl: string, size = 32): string | null {
  try {
    if (!chrome.runtime?.id) return null
    const u = new URL(chrome.runtime.getURL("/_favicon/"))
    u.searchParams.set("pageUrl", pageUrl)
    u.searchParams.set("size", String(size))
    return u.toString()
  } catch {
    return null
  }
}
