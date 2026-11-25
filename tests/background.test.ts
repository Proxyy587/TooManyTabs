import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"

const LATER = "00000000-0000-4000-8000-000000000001"
type G = { id: string; name: string; tabs: { url: string; title: string }[]; deleted?: boolean; dirty?: boolean; version?: number; updatedAt: string; pinned?: boolean }

/** Load public/background.js in a sandbox with an in-memory chrome.* and a scripted fetch. */
function load(store: Record<string, unknown>, fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = async () => new Response("{}")) {
  const ev = () => ({ addListener: () => {} })
  const chrome = {
    runtime: { onInstalled: ev(), onStartup: ev(), onMessage: ev(), getURL: (p: string) => p, id: "x" },
    alarms: { create: () => {}, onAlarm: ev() },
    action: { onClicked: ev(), setBadgeText: () => {}, setBadgeBackgroundColor: () => {} },
    contextMenus: { onClicked: ev(), removeAll: () => {}, create: () => {} },
    commands: { onCommand: ev() },
    tabs: { query: async () => [], remove: async () => {}, create: async () => ({}), update: async () => ({}) },
    windows: { update: async () => ({}) },
    identity: {},
    storage: {
      local: {
        get: async (keys: string | string[]) => {
          const out: Record<string, unknown> = {}
          for (const k of Array.isArray(keys) ? keys : [keys]) if (k in store) out[k] = structuredClone(store[k])
          return out
        },
        set: async (d: Record<string, unknown>) => Object.assign(store, structuredClone(d)),
        remove: async () => {},
      },
    },
  }
  const ctx = vm.createContext({ chrome, fetch: fetchImpl, console, crypto, navigator: { userAgent: "", platform: "" }, setTimeout, structuredClone, URL, Response })
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../public/background.js"), "utf8"), ctx)
  return ctx as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>
}

const t = (url: string, title = url) => ({ url, title })
const now = new Date().toISOString()

describe("background worker", () => {
  it("folds old title-named one-tab shelves into Later without losing tabs", async () => {
    const store: Record<string, unknown> = {
      tabGroups: [
        { id: LATER, name: "Later", tabs: [t("https://a.com")], updatedAt: now },
        { id: "g1", name: "Basic Usage | Better Auth", tabs: [t("https://better-auth.com/docs", "Basic Usage | Better Auth")], updatedAt: now },
        { id: "g2", name: "github.com", tabs: [t("https://github.com/1"), t("https://github.com/2")], updatedAt: now },
        { id: "g3", name: "My research", tabs: [t("https://x.com", "Something else")], updatedAt: now },
      ] as G[],
    }
    const bg = load(store)
    await bg.foldTitleShelves()
    const groups = store.tabGroups as G[]
    const later = groups.find((g) => g.id === LATER)!
    expect(later.tabs.map((x) => x.url)).toEqual(["https://a.com", "https://better-auth.com/docs"])
    expect(groups.find((g) => g.id === "g1")).toMatchObject({ deleted: true, dirty: true, tabs: [] })
    expect(groups.find((g) => g.id === "g2")!.deleted).toBeFalsy() // a real multi-tab shelf stays
    expect(groups.find((g) => g.id === "g3")!.deleted).toBeFalsy() // a named shelf stays
  })

  it("saves a tab to Later once and only closes it when the setting is on", async () => {
    const closed: number[] = []
    const store: Record<string, unknown> = { tabGroups: [], closeOnPark: false }
    const bg = load(store)
    ;(bg as unknown as { chrome: { tabs: { remove: (id: number) => Promise<void> } } }).chrome.tabs.remove = async (id: number) => {
      closed.push(id)
    }
    await bg.saveTabToLater({ id: 7, url: "https://a.com", title: "A" })
    await bg.saveTabToLater({ id: 7, url: "https://a.com", title: "A" })
    const later = (store.tabGroups as G[]).find((g) => g.id === LATER)!
    expect(later.tabs).toHaveLength(1)
    expect(closed).toEqual([])
    store.closeOnPark = true
    await bg.saveTabToLater({ id: 8, url: "https://b.com", title: "B" })
    expect(closed).toEqual([8])
  })

  it("push keeps edits made during the request and merges conflicts instead of dropping either side", async () => {
    const store: Record<string, unknown> = {
      authToken: "jwt",
      tabGroups: [
        { id: "s1", name: "Mine", tabs: [t("https://local.com")], dirty: true, version: 1, updatedAt: "2026-11-25T10:00:00.000Z" },
        { id: "s2", name: "Edited mid-flight", tabs: [t("https://one.com")], dirty: true, version: 3, updatedAt: "2026-11-25T10:00:00.000Z" },
        { id: "s3", name: "Gone", tabs: [], deleted: true, dirty: true, updatedAt: "2026-11-25T10:00:00.000Z" },
      ] as G[],
    }
    const bg = load(store, async (url) => {
      if (url.endsWith("/sync/push")) {
        // simulate the user editing s2 while the request is in flight
        const groups = store.tabGroups as G[]
        store.tabGroups = groups.map((g) => (g.id === "s2" ? { ...g, tabs: [...g.tabs, t("https://two.com")], updatedAt: "2026-11-25T10:00:05.000Z" } : g))
        return new Response(
          JSON.stringify({
            accepted: ["s2", "s3"],
            versions: { s2: 4 },
            conflicts: [{ id: "s1", name: "Theirs", pinned: false, version: 2, deleted: false, updatedAt: "2026-11-25T09:00:00.000Z", tabs: [t("https://remote.com")] }],
          })
        )
      }
      return new Response("{}")
    })
    await bg.pushSyncQueue()
    const groups = store.tabGroups as G[]
    const s1 = groups.find((g) => g.id === "s1")!
    expect(s1.tabs.map((x) => x.url).sort()).toEqual(["https://local.com", "https://remote.com"])
    expect(s1).toMatchObject({ dirty: true, version: 2, name: "Mine" }) // local edit newer → keeps local name, re-pushes
    const s2 = groups.find((g) => g.id === "s2")!
    expect(s2.tabs).toHaveLength(2) // mid-flight edit kept
    expect(s2).toMatchObject({ dirty: true, version: 4 }) // still dirty: the server hasn't seen the second tab
    expect(groups.find((g) => g.id === "s3")).toBeUndefined() // accepted tombstone dropped
  })
})
