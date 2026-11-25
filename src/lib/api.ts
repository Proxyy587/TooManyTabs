/**
 * Local-first storage for shelves (saved tabs) and preferences, plus thin
 * wrappers around messages to the background worker (sign-in, sync).
 *
 * Every write goes through mutateGroups(), which reads ALL records including
 * soft-deleted tombstones, so deletes survive until the sync server has
 * accepted them. Writes are serialised so two quick clicks can't race.
 */
import { isCategoryId, type CategoryRules } from "./categories"
import {
  obtainGoogleCredential,
  revokeCachedGoogleToken,
  type AuthUser,
  type LoginResult,
} from "./auth"
export type { AuthUser } from "./auth"

export interface TabData {
  url: string
  title: string
  favIconUrl?: string | null
  position?: number
}

export interface TabGroup {
  id: string
  name: string
  pinned: boolean
  tabs: TabData[]
  updatedAt: string
  createdAt?: string
  deleted?: boolean
  dirty?: boolean
  /** server version this copy is based on (sync) */
  version?: number
}

/** Stable id for the default Later inbox */
export const LATER_SHELF_ID = "00000000-0000-4000-8000-000000000001"
export const LATER_SHELF_NAME = "Later"

export type ThemeMode = "system" | "light" | "dark"
export type PaletteId = "pip" | "dusk" | "mint" | "peach" | "sky" | "gum"
export const PALETTE_IDS: readonly PaletteId[] = ["pip", "dusk", "mint", "peach", "sky", "gum"]
export type Density = "cozy" | "compact"

export interface AppPrefs {
  themeMode: ThemeMode
  /** colour theme; light/dark comes from themeMode */
  palette: PaletteId
  density: Density
  closeOnPark: boolean
  onboardingDismissed: boolean
  /** open tabs untouched for this many days count as "dusty" */
  staleDays: number
  /** host → category overrides made by the user */
  categoryRules: CategoryRules
}

export const DEFAULT_PREFS: AppPrefs = {
  themeMode: "system",
  palette: "pip",
  density: "cozy",
  closeOnPark: false,
  onboardingDismissed: false,
  staleDays: 3,
  categoryRules: {},
}

export const PREF_KEYS = ["themeMode", "palette", "density", "closeOnPark", "onboardingDismissed", "staleDays", "categoryRules"] as const

function now(): string {
  return new Date().toISOString()
}

async function storageGet<T>(keys: string[]): Promise<Partial<T>> {
  return (await chrome.storage.local.get(keys as string[])) as unknown as Partial<T>
}

async function storageSet(data: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set(data)
}

function sendMessage<T = unknown>(payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve(response as T)
      })
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)))
    }
  })
}

function requestPush() {
  sendMessage({ action: "pushDirty" }).catch(() => {})
}

// ------------------------------------------------------------------ groups

function cleanTab(t: Partial<TabData>, position: number): TabData | null {
  if (typeof t.url !== "string" || !t.url) return null
  return {
    url: t.url,
    title: typeof t.title === "string" && t.title ? t.title : t.url,
    favIconUrl: typeof t.favIconUrl === "string" ? t.favIconUrl : null,
    position,
  }
}

function cleanTabs(tabs: Partial<TabData>[]): TabData[] {
  return tabs
    .map((t, i) => cleanTab(t, i))
    .filter((t): t is TabData => t !== null)
    .map((t, i) => ({ ...t, position: i }))
}

function uniqueByUrl(tabs: TabData[]): TabData[] {
  const seen = new Set<string>()
  return tabs.filter((t) => (seen.has(t.url) ? false : (seen.add(t.url), true)))
}

async function readAllGroups(): Promise<TabGroup[]> {
  const { tabGroups } = await storageGet<{ tabGroups: TabGroup[] }>(["tabGroups"])
  return Array.isArray(tabGroups) ? tabGroups : []
}

let writeChain: Promise<unknown> = Promise.resolve()

/** Read-modify-write over all records (tombstones included), serialised. */
export function mutateGroups(fn: (all: TabGroup[]) => TabGroup[]): Promise<TabGroup[]> {
  const run = writeChain.then(async () => {
    const next = fn(await readAllGroups())
    await storageSet({ tabGroups: next })
    requestPush()
    return next.filter((g) => !g.deleted)
  })
  writeChain = run.catch(() => {})
  return run
}

function touch(g: TabGroup, patch: Partial<TabGroup>): TabGroup {
  return { ...g, ...patch, updatedAt: now(), dirty: true }
}

export function sortShelves(groups: TabGroup[]): TabGroup[] {
  return [...groups].sort(
    (a, b) =>
      Number(b.id === LATER_SHELF_ID) - Number(a.id === LATER_SHELF_ID) ||
      Number(b.pinned) - Number(a.pinned) ||
      (b.createdAt || b.updatedAt).localeCompare(a.createdAt || a.updatedAt)
  )
}

/** Visible shelves, with the Later inbox guaranteed to exist and be first. */
export async function listGroups(): Promise<TabGroup[]> {
  const all = await readAllGroups()
  const later = all.find((g) => g.id === LATER_SHELF_ID)
  if (later && !later.deleted) return sortShelves(all.filter((g) => !g.deleted))
  const fixed = await mutateGroups((groups) => {
    const existing = groups.find((g) => g.id === LATER_SHELF_ID)
    if (existing) {
      return groups.map((g) =>
        g.id === LATER_SHELF_ID ? touch(g, { deleted: false, name: LATER_SHELF_NAME, pinned: true }) : g
      )
    }
    const t = now()
    return [
      { id: LATER_SHELF_ID, name: LATER_SHELF_NAME, pinned: true, tabs: [], createdAt: t, updatedAt: t, dirty: true },
      ...groups,
    ]
  })
  return sortShelves(fixed)
}

export async function createShelf(name: string, tabs: TabData[]): Promise<TabGroup> {
  const t = now()
  const group: TabGroup = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 200) || `Shelf ${new Date().toLocaleDateString()}`,
    pinned: false,
    tabs: cleanTabs(uniqueByUrl(tabs)),
    createdAt: t,
    updatedAt: t,
    dirty: true,
  }
  await mutateGroups((all) => [group, ...all])
  return group
}

/** Add tabs to a shelf, skipping URLs it already holds. Returns how many were added. */
export async function addToShelf(groupId: string, tabs: TabData[]): Promise<number> {
  let added = 0
  await mutateGroups((all) =>
    all.map((g) => {
      if (g.id !== groupId) return g
      const have = new Set(g.tabs.map((t) => t.url))
      const fresh = uniqueByUrl(cleanTabs(tabs)).filter((t) => !have.has(t.url))
      added = fresh.length
      if (!fresh.length && !g.deleted) return g
      return touch(g, { deleted: false, tabs: cleanTabs([...g.tabs, ...fresh]) })
    })
  )
  return added
}

function withoutTab(g: TabGroup, index: number, url: string): TabGroup | null {
  if (g.tabs[index]?.url !== url) return null // stale UI index: refuse rather than delete the wrong tab
  const tabs = cleanTabs(g.tabs.filter((_, i) => i !== index))
  // Empty named shelves disappear; the Later inbox always stays.
  if (!tabs.length && g.id !== LATER_SHELF_ID) return touch(g, { tabs: [], deleted: true })
  return touch(g, { tabs })
}

export async function removeSavedTab(groupId: string, index: number, url: string): Promise<boolean> {
  let ok = false
  await mutateGroups((all) =>
    all.map((g) => {
      if (g.id !== groupId) return g
      const next = withoutTab(g, index, url)
      if (!next) return g
      ok = true
      return next
    })
  )
  return ok
}

export async function moveSavedTab(fromId: string, index: number, url: string, toId: string): Promise<boolean> {
  if (fromId === toId) return false
  let ok = false
  await mutateGroups((all) => {
    const from = all.find((g) => g.id === fromId)
    const tab = from?.tabs[index]
    if (!from || !tab || tab.url !== url || !all.some((g) => g.id === toId)) return all
    ok = true
    return all.map((g) => {
      if (g.id === fromId) return withoutTab(g, index, url) || g
      if (g.id === toId) return touch(g, { deleted: false, tabs: cleanTabs(uniqueByUrl([...g.tabs, tab])) })
      return g
    })
  })
  return ok
}

export async function renameGroup(groupId: string, name: string): Promise<void> {
  const clean = name.trim().slice(0, 200)
  if (!clean || groupId === LATER_SHELF_ID) return
  await mutateGroups((all) => all.map((g) => (g.id === groupId ? touch(g, { name: clean }) : g)))
}

export async function togglePin(groupId: string): Promise<void> {
  if (groupId === LATER_SHELF_ID) return
  await mutateGroups((all) => all.map((g) => (g.id === groupId ? touch(g, { pinned: !g.pinned }) : g)))
}

/** Soft delete (kept as a tombstone until sync accepts it). The Later inbox is emptied instead. */
export async function deleteGroup(groupId: string): Promise<void> {
  await mutateGroups((all) =>
    all.map((g) => {
      if (g.id !== groupId) return g
      return g.id === LATER_SHELF_ID ? touch(g, { tabs: [] }) : touch(g, { deleted: true, tabs: [] })
    })
  )
}

/** Put a shelf back exactly as it was (used by Undo). */
export async function restoreGroup(snapshot: TabGroup): Promise<void> {
  await mutateGroups((all) => {
    const current = all.find((g) => g.id === snapshot.id)
    const back = touch({ ...snapshot, version: current?.version ?? snapshot.version }, { deleted: false })
    return current ? all.map((g) => (g.id === snapshot.id ? back : g)) : [back, ...all]
  })
}

export async function mergeGroups(groupIds: string[], name: string): Promise<TabGroup | null> {
  let created: TabGroup | null = null
  await mutateGroups((all) => {
    const picked = all.filter((g) => groupIds.includes(g.id) && !g.deleted)
    if (picked.length < 2) return all
    const t = now()
    const merged: TabGroup = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 200) || "Merged",
      pinned: picked.some((g) => g.pinned && g.id !== LATER_SHELF_ID),
      tabs: cleanTabs(uniqueByUrl(picked.flatMap((g) => g.tabs))),
      createdAt: t,
      updatedAt: t,
      dirty: true,
    }
    created = merged
    return [
      merged,
      ...all.map((g) =>
        groupIds.includes(g.id)
          ? g.id === LATER_SHELF_ID
            ? touch(g, { tabs: [] })
            : touch(g, { deleted: true, tabs: [] })
          : g
      ),
    ]
  })
  return created
}

// ------------------------------------------------------------------ backup

export async function exportGroupsJson(): Promise<string> {
  const groups = (await readAllGroups()).filter((g) => !g.deleted)
  const prefs = await getPrefs()
  return JSON.stringify(
    {
      app: "TooManyTabs",
      version: 2,
      exportedAt: now(),
      tabGroups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        pinned: g.pinned,
        tabs: g.tabs,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
      categoryRules: prefs.categoryRules,
    },
    null,
    2
  )
}

/** Merge a backup into local data (never deletes anything). Returns the number of shelves read. */
export async function importGroupsJson(json: string): Promise<number> {
  let parsed: { tabGroups?: unknown; categoryRules?: unknown }
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (!parsed || !Array.isArray(parsed.tabGroups)) throw new Error("That file isn't a TooManyTabs backup.")
  const incoming: TabGroup[] = (parsed.tabGroups as Partial<TabGroup>[])
    .filter((g) => g && typeof g === "object")
    .map((g) => ({
      id: typeof g.id === "string" && g.id ? g.id : crypto.randomUUID(),
      name: typeof g.name === "string" && g.name ? g.name.slice(0, 200) : "Imported",
      pinned: !!g.pinned,
      tabs: cleanTabs(Array.isArray(g.tabs) ? g.tabs : []),
      createdAt: typeof g.createdAt === "string" ? g.createdAt : now(),
      updatedAt: now(),
      deleted: false,
      dirty: true,
    }))
  await mutateGroups((all) => {
    const byId = new Map(all.map((g) => [g.id, g]))
    for (const g of incoming) {
      const existing = byId.get(g.id)
      byId.set(
        g.id,
        existing && !existing.deleted
          ? { ...g, name: existing.name, version: existing.version, tabs: cleanTabs(uniqueByUrl([...existing.tabs, ...g.tabs])) }
          : { ...g, version: existing?.version }
      )
    }
    return [...byId.values()]
  })
  if (parsed.categoryRules && typeof parsed.categoryRules === "object") {
    const prefs = await getPrefs()
    await setPrefs({ categoryRules: { ...sanitizeRules(parsed.categoryRules), ...prefs.categoryRules } })
  }
  return incoming.length
}

// ------------------------------------------------------------------ prefs

export function sanitizeRules(raw: unknown): CategoryRules {
  const out: CategoryRules = {}
  if (!raw || typeof raw !== "object") return out
  for (const [host, cat] of Object.entries(raw as Record<string, unknown>)) {
    if (/^[a-z0-9.-]+$/i.test(host) && isCategoryId(cat)) out[host.toLowerCase()] = cat
  }
  return out
}

export async function getPrefs(): Promise<AppPrefs> {
  const raw = await storageGet<Record<string, unknown>>([...PREF_KEYS])
  const staleDays = Number(raw.staleDays)
  return {
    themeMode: raw.themeMode === "dark" || raw.themeMode === "light" ? raw.themeMode : "system",
    palette: PALETTE_IDS.find((id) => id === raw.palette) ?? DEFAULT_PREFS.palette,
    density: raw.density === "compact" ? "compact" : "cozy",
    closeOnPark: raw.closeOnPark === true,
    onboardingDismissed: raw.onboardingDismissed === true,
    staleDays: [1, 3, 7, 14].includes(staleDays) ? staleDays : DEFAULT_PREFS.staleDays,
    categoryRules: sanitizeRules(raw.categoryRules),
  }
}

export async function setPrefs(patch: Partial<AppPrefs>): Promise<AppPrefs> {
  const next = { ...(await getPrefs()), ...patch }
  await storageSet({ ...next })
  return next
}

// ------------------------------------------------------------------ account & sync

export async function getSyncMeta(): Promise<{ lastSyncedAt: string | null; lastSyncError: string | null }> {
  const { lastSyncedAt, lastSyncError } = await storageGet<{ lastSyncedAt: string; lastSyncError: string }>([
    "lastSyncedAt",
    "lastSyncError",
  ])
  return { lastSyncedAt: lastSyncedAt || null, lastSyncError: lastSyncError || null }
}

export async function googleLogin(): Promise<LoginResult> {
  const credential = await obtainGoogleCredential()
  const response = await sendMessage<{ success: boolean; data?: LoginResult; error?: string }>({
    action: "googleLogin",
    ...credential,
  })
  if (!response?.success || !response.data) {
    if ("accessToken" in credential) await revokeCachedGoogleToken(credential.accessToken)
    throw new Error(response?.error || "Sign-in failed on the sync server.")
  }
  return response.data
}

export async function logout(): Promise<void> {
  try {
    await sendMessage({ action: "logout" })
  } catch {
    await chrome.storage.local.remove(["authToken", "refreshToken", "user", "deviceId", "lastSyncedAt", "lastSyncError"])
  }
}

export async function getAuthState(): Promise<{ loggedIn: boolean; user: AuthUser | null }> {
  const { authToken, user } = await storageGet<{ authToken: string; user: AuthUser }>(["authToken", "user"])
  return { loggedIn: !!authToken, user: user || null }
}

export async function manualSync(): Promise<void> {
  const response = await sendMessage<{ success: boolean; error?: string }>({ action: "manualSync" })
  if (!response?.success) throw new Error(response?.error || "Sync failed")
}
