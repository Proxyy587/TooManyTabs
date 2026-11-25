import { useCallback, useEffect, useMemo, useState } from "react"
import {
  DEFAULT_PREFS,
  PREF_KEYS,
  getAuthState,
  getPrefs,
  getSyncMeta,
  listGroups,
  setPrefs as savePrefs,
  sortShelves,
  type AppPrefs,
  type AuthUser,
  type TabGroup,
} from "@/lib/api"
import { getOpenTabs, watchBrowser } from "@/lib/browser"
import { buildItems, type Item, type RawTab } from "@/lib/items"

export type SyncInfo = { lastSyncedAt: string | null; lastSyncError: string | null }

/** Everything the page shows, kept live from chrome.tabs + chrome.storage. */
export function useTabsData() {
  const [ready, setReady] = useState(false)
  const [tabs, setTabs] = useState<RawTab[]>([])
  const [groups, setGroups] = useState<TabGroup[]>([])
  const [prefs, setPrefsState] = useState<AppPrefs>(DEFAULT_PREFS)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [sync, setSync] = useState<SyncInfo>({ lastSyncedAt: null, lastSyncError: null })
  const [now, setNow] = useState(() => Date.now())

  const reloadTabs = useCallback(async () => {
    setTabs(await getOpenTabs())
    setNow(Date.now())
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([getOpenTabs(), listGroups(), getPrefs(), getAuthState(), getSyncMeta()]).then(([t, g, p, a, s]) => {
      if (!alive) return
      setTabs(t)
      setGroups(g)
      setPrefsState(p)
      setUser(a.user)
      setSync(s)
      setReady(true)
    })

    const stopWatching = watchBrowser(() => {
      if (alive) reloadTabs()
    })
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local" || !alive) return
      if (changes.tabGroups) {
        const next = (changes.tabGroups.newValue as TabGroup[] | undefined) || []
        setGroups(sortShelves(next.filter((g) => !g.deleted)))
      }
      if (changes.authToken || changes.user) getAuthState().then((a) => alive && setUser(a.user))
      if (changes.lastSyncedAt || changes.lastSyncError) getSyncMeta().then((s) => alive && setSync(s))
      if (PREF_KEYS.some((k) => k in changes)) {
        getPrefs().then((p) => alive && setPrefsState(p))
      }
    }
    chrome.storage.onChanged.addListener(onStorage)
    // relative times ("2h") and "dusty" flags drift; refresh once a minute
    const tick = setInterval(() => alive && setNow(Date.now()), 60_000)
    return () => {
      alive = false
      stopWatching()
      chrome.storage.onChanged.removeListener(onStorage)
      clearInterval(tick)
    }
  }, [reloadTabs])

  const updatePrefs = useCallback(async (patch: Partial<AppPrefs>) => {
    setPrefsState((p) => ({ ...p, ...patch }))
    setPrefsState(await savePrefs(patch))
  }, [])

  const items: Item[] = useMemo(
    () => buildItems({ tabs, groups, bookmarks: [], rules: prefs.categoryRules, staleDays: prefs.staleDays, now }),
    [tabs, groups, prefs.categoryRules, prefs.staleDays, now]
  )

  return { ready, items, tabs, groups, prefs, updatePrefs, user, sync, now, reloadTabs }
}
