"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ToastProvider, useToast } from "@/components/shared/Toast"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Input } from "@/components/ui/input"
import { CubeMark } from "@/components/brand/CubeMark"
import { Credits } from "@/components/brand/Credits"
import { ParkModal } from "@/features/shelf/ParkModal"
import { Onboarding } from "@/features/shelf/Onboarding"
import { SyncChip, type SyncState } from "@/features/shelf/SyncChip"
import { SettingsPage } from "@/features/settings/SettingsPage"
import {
  Search,
  Settings,
  ExternalLink,
  Copy,
  Trash2,
  Pin,
  RotateCcw,
  FolderInput,
  Merge,
  MoreHorizontal,
} from "lucide-react"
import {
  googleLogin,
  logout,
  getAuthState,
  ensureLaterShelf,
  saveTabsAsGroup,
  appendTabsToGroup,
  renameGroup,
  togglePin,
  deleteGroup,
  deleteTabFromGroup,
  moveTabToGroup,
  restoreTabs,
  restoreSingleTab,
  closeTabs,
  manualSync,
  mergeGroups,
  findDuplicateOpenTabs,
  suggestDomainGroups,
  getPrefs,
  setPrefs,
  exportGroupsJson,
  importGroupsJson,
  getSyncMeta,
  LATER_SHELF_ID,
  type TabGroup,
  type TabData,
  type AuthUser,
  type AppPrefs,
  type ViewMode,
} from "@/lib/api"

type AppView = "shelf" | "settings"
type ShelfFilter = "all" | "later" | string

type OpenTab = {
  id: string
  url: string
  title: string
  favIconUrl?: string
}

function AppInner() {
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)

  const [view, setView] = useState<AppView>("shelf")
  const [prefs, setPrefsState] = useState<AppPrefs | null>(null)
  const [groups, setGroups] = useState<TabGroup[]>([])
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ShelfFilter>("later")
  const [showPark, setShowPark] = useState(false)
  const [isParking, setIsParking] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncState, setSyncState] = useState<SyncState>("offline")
  const [syncHint, setSyncHint] = useState<string | undefined>()
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [mergeSelect, setMergeSelect] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [moveMenu, setMoveMenu] = useState<{ groupId: string; index: number } | null>(null)
  const [shelfMenuOpen, setShelfMenuOpen] = useState(false)
  const [rowMenu, setRowMenu] = useState<{ groupId: string; index: number } | null>(null)

  const applyTheme = (p: AppPrefs) => {
    document.documentElement.dataset.mode = p.themeMode
    document.documentElement.dataset.accent = p.themeAccent
    document.documentElement.classList.toggle("dark", p.themeMode === "dark")
  }

  const refreshSyncChip = useCallback(async (loggedIn: boolean) => {
    if (!loggedIn) {
      setSyncState("offline")
      setSyncHint("Guest — this device only")
      return
    }
    const meta = await getSyncMeta()
    if (meta.lastSyncError) {
      setSyncState("error")
      setSyncHint(meta.lastSyncError)
    } else if (meta.lastSyncedAt) {
      setSyncState("synced")
      setSyncHint(`Last synced ${new Date(meta.lastSyncedAt).toLocaleString()}`)
    } else {
      setSyncState("synced")
      setSyncHint("Signed in")
    }
  }, [])

  const loadGroups = useCallback(async () => {
    const g = await ensureLaterShelf()
    setGroups(g)
  }, [])

  const loadOpenTabs = useCallback(async () => {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      setOpenTabs(
        tabs
          .filter(
            (t) =>
              t.id != null &&
              t.url &&
              !t.url.startsWith("chrome://") &&
              !t.url.startsWith("chrome-extension://") &&
              !t.url.startsWith("edge://") &&
              !t.url.startsWith("brave://")
          )
          .map((t) => ({
            id: String(t.id),
            url: t.url!,
            title: t.title || t.url || "Untitled",
            favIconUrl: t.favIconUrl,
          }))
      )
    } catch {
      setOpenTabs([])
    }
  }, [])

  const initAuth = useCallback(async () => {
    try {
      setIsAuthLoading(true)
      const state = await getAuthState()
      setIsAuthenticated(state.loggedIn)
      setUser(state.user)
      await refreshSyncChip(state.loggedIn)
    } finally {
      setIsAuthLoading(false)
    }
  }, [refreshSyncChip])

  useEffect(() => {
    ;(async () => {
      const p = await getPrefs()
      setPrefsState(p)
      applyTheme(p)
    })()
    initAuth()
    loadGroups()
    loadOpenTabs()
    const onStorage = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return
      if (changes.tabGroups) {
        setGroups(
          ((changes.tabGroups.newValue || []) as TabGroup[]).filter((g) => !g.deleted)
        )
      }
      if (changes.authToken || changes.user) {
        initAuth()
        if (changes.authToken?.newValue) setTimeout(loadGroups, 500)
      }
      if (changes.lastSyncedAt || changes.lastSyncError) {
        getAuthState().then((s) => refreshSyncChip(s.loggedIn))
      }
    }
    chrome.storage.onChanged.addListener(onStorage)
    return () => chrome.storage.onChanged.removeListener(onStorage)
  }, [initAuth, loadGroups, loadOpenTabs, refreshSyncChip])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && openTabs.length) {
        e.preventDefault()
        setShowPark(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openTabs.length])

  const updatePrefs = async (patch: Partial<AppPrefs>) => {
    const next = await setPrefs(patch)
    setPrefsState(next)
    applyTheme(next)
  }

  const viewMode: ViewMode = prefs?.viewMode ?? "list"
  const closeOnPark = prefs?.closeOnPark ?? false

  const sortedShelves = useMemo(() => {
    const later = groups.find((g) => g.id === LATER_SHELF_ID)
    const rest = [...groups]
      .filter((g) => g.id !== LATER_SHELF_ID)
      .sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name)
      )
    return { later, rest }
  }, [groups])

  const visibleTabs = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list: Array<TabData & { groupId: string; groupName: string; index: number }> = []
    const source =
      filter === "all"
        ? groups
        : filter === "later"
          ? groups.filter((g) => g.id === LATER_SHELF_ID)
          : groups.filter((g) => g.id === filter)

    for (const g of source) {
      g.tabs.forEach((t, index) => {
        if (
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.url.toLowerCase().includes(q) ||
          g.name.toLowerCase().includes(q)
        ) {
          list.push({ ...t, groupId: g.id, groupName: g.name, index })
        }
      })
    }

    return list.sort((a, b) => {
      if (filter === "all") {
        const byShelf = a.groupName.localeCompare(b.groupName)
        if (byShelf !== 0) return byShelf
      }
      return a.title.localeCompare(b.title) || a.index - b.index
    })
  }, [groups, filter, query])

  const activeShelf = useMemo(() => {
    if (filter === "later") return sortedShelves.later || null
    if (filter === "all") return null
    return groups.find((g) => g.id === filter) || null
  }, [filter, groups, sortedShelves.later])

  const hostOf = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "")
    } catch {
      return url
    }
  }

  const dupes = useMemo(() => findDuplicateOpenTabs(openTabs), [openTabs])
  const dupeCount = [...dupes.values()].reduce((n, ids) => n + (ids.length - 1), 0)

  const handleLogin = async () => {
    try {
      setIsAuthLoading(true)
      const data = await googleLogin()
      setIsAuthenticated(true)
      setUser(data.user)
      toast("Signed in", "success")
      await refreshSyncChip(true)
      setTimeout(loadGroups, 800)
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 160) : "Sign-in failed", "error")
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    setIsAuthenticated(false)
    setUser(null)
    await refreshSyncChip(false)
    toast("Signed out", "info")
  }

  const handleSync = async () => {
    if (!isAuthenticated) {
      toast("Sign in to sync", "info")
      return
    }
    setIsSyncing(true)
    setSyncState("syncing")
    try {
      setGroups(await manualSync())
      await chrome.storage.local.set({
        lastSyncedAt: new Date().toISOString(),
        lastSyncError: null,
      })
      toast("Synced", "success")
      await refreshSyncChip(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed"
      await chrome.storage.local.set({ lastSyncError: msg })
      setSyncState("error")
      setSyncHint(msg)
      toast(msg, "error")
    } finally {
      setIsSyncing(false)
    }
  }

  const handlePark = async ({
    tabIds,
    dest,
    newName,
  }: {
    tabIds: string[]
    dest: string
    newName: string
  }) => {
    const selected = openTabs.filter((t) => tabIds.includes(t.id))
    if (!selected.length) return
    setIsParking(true)
    try {
      await ensureLaterShelf()
      const payload: TabData[] = selected.map((t, i) => ({
        url: t.url,
        title: t.title,
        favIconUrl: t.favIconUrl,
        position: i,
      }))
      if (dest === "later") {
        await appendTabsToGroup(LATER_SHELF_ID, payload)
        toast("Parked to Later", "success")
        setFilter("later")
      } else if (dest === "new") {
        await saveTabsAsGroup(payload, newName || `Shelf ${new Date().toLocaleString()}`)
        toast(`Saved “${newName || "Shelf"}”`, "success")
        setFilter("all")
      } else {
        await appendTabsToGroup(dest, payload)
        toast("Added to shelf", "success")
        setFilter(dest)
      }
      setShowPark(false)
      await loadGroups()
      if (closeOnPark) {
        const ids = selected.map((t) => Number.parseInt(t.id, 10)).filter((n) => !Number.isNaN(n))
        if (ids.length > 1) await closeTabs(ids.slice(0, -1))
        else if (ids.length === 1 && openTabs.length > 1) await closeTabs(ids)
        setTimeout(loadOpenTabs, 250)
      }
    } catch {
      toast("Couldn't park tabs", "error")
    } finally {
      setIsParking(false)
    }
  }

  const handleSortBySite = async () => {
    if (!openTabs.length) return
    const suggestions = suggestDomainGroups(
      openTabs.map((t) => ({ url: t.url, title: t.title, favIconUrl: t.favIconUrl }))
    ).filter((d) => d.tabs.length >= 2)
    if (!suggestions.length) {
      toast("Need 2+ tabs from the same site", "info")
      return
    }
    try {
      for (const s of suggestions) {
        await saveTabsAsGroup(
          s.tabs.map((t, i) => ({
            url: t.url,
            title: t.title || "Untitled",
            favIconUrl: t.favIconUrl,
            position: i,
          })),
          s.domain
        )
      }
      toast(`Sorted into ${suggestions.length} shelves`, "success")
      await loadGroups()
    } catch {
      toast("Couldn't sort by site", "error")
    }
  }

  const handleCloseDuplicates = async () => {
    const toClose: number[] = []
    for (const ids of dupes.values()) {
      for (const id of ids.slice(1)) {
        const n = Number.parseInt(id, 10)
        if (!Number.isNaN(n)) toClose.push(n)
      }
    }
    if (!toClose.length) return
    await closeTabs(toClose)
    toast(`Closed ${toClose.length} duplicates`, "success")
    setTimeout(loadOpenTabs, 200)
  }

  const commitRename = async (id: string) => {
    const name = editName.trim()
    setEditingFolder(null)
    if (!name || id === LATER_SHELF_ID) return
    await renameGroup(id, name)
    await loadGroups()
  }

  const handleMerge = async () => {
    const ids = [...mergeSelect]
    if (ids.length < 2) return
    const name = window.prompt("Name for merged shelf")
    if (!name?.trim()) return
    await mergeGroups(ids, name.trim())
    setMergeSelect(new Set())
    toast("Merged", "success")
    await loadGroups()
  }

  const handleExport = async () => {
    const json = await exportGroupsJson()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `toomanytabs-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast("Exported", "success")
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      setGroups(await importGroupsJson(text))
      toast("Imported", "success")
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed", "error")
    }
  }

  if (!prefs) {
    return (
      <div className="app-shell grid place-items-center text-sm" style={{ color: "var(--ink-3)" }}>
        Loading shelf…
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-chrome space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5"
            onClick={() => setView("shelf")}
            aria-label="TooManyTabs home"
          >
            <CubeMark className="text-[var(--blue)]" />
            <h1 className="font-display text-sm" style={{ color: "var(--ink)" }}>
              TooMany<span style={{ color: "var(--pop)" }}>Tabs</span>
            </h1>
          </button>

          {view === "shelf" ? (
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                style={{ color: "var(--ink-3)" }}
              />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-8 rounded-sm border pl-8 pr-3 text-xs shadow-none"
                style={{
                  background: "var(--paper-2)",
                  borderColor: "var(--line)",
                  color: "var(--ink)",
                }}
              />
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}

          <div className="flex shrink-0 items-center gap-1">
            {(syncState === "error" || isSyncing) && (
              <SyncChip state={isSyncing ? "syncing" : syncState} title={syncHint} />
            )}
            {view === "shelf" && (
              <button
                type="button"
                className="btn-solid !h-8"
                onClick={() => setShowPark(true)}
                disabled={!openTabs.length}
                title={openTabs.length ? `${openTabs.length} open tabs` : "No open tabs"}
              >
                Park{openTabs.length ? ` · ${openTabs.length}` : ""}
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={() => setView((v) => (v === "settings" ? "shelf" : "settings"))}
              aria-label="Settings"
              style={{
                background: view === "settings" ? "var(--blue-soft)" : undefined,
                color: view === "settings" ? "var(--blue)" : undefined,
              }}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {view === "shelf" && (
          <div className="shelf-rail">
            <div className="shelf-rail-scroll">
              <button
                type="button"
                className="filter-tab"
                data-active={filter === "later"}
                onClick={() => {
                  setFilter("later")
                  setShelfMenuOpen(false)
                }}
              >
                Later
                {sortedShelves.later && sortedShelves.later.tabs.length > 0
                  ? ` ${sortedShelves.later.tabs.length}`
                  : ""}
              </button>
              <button
                type="button"
                className="filter-tab"
                data-active={filter === "all"}
                onClick={() => {
                  setFilter("all")
                  setShelfMenuOpen(false)
                }}
              >
                All
              </button>
              {sortedShelves.rest.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className="filter-tab inline-flex items-center gap-1"
                  data-active={filter === g.id}
                  data-selected={mergeSelect.has(g.id) || undefined}
                  onClick={() => {
                    setFilter(g.id)
                    setShelfMenuOpen(false)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setMergeSelect((prev) => {
                      const next = new Set(prev)
                      if (next.has(g.id)) next.delete(g.id)
                      else next.add(g.id)
                      return next
                    })
                  }}
                >
                  {g.pinned ? <Pin className="h-2.5 w-2.5" /> : null}
                  {g.name}
                </button>
              ))}
            </div>

            <div className="relative flex shrink-0 items-center gap-0.5">
              {activeShelf && activeShelf.tabs.length > 0 && (
                <button
                  type="button"
                  className="icon-btn"
                  title="Restore shelf"
                  onClick={async () => {
                    await restoreTabs(activeShelf.tabs.map((t) => t.url))
                    toast("Restored", "success")
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              {mergeSelect.size >= 2 && (
                <button
                  type="button"
                  className="icon-btn"
                  title={`Merge ${mergeSelect.size} shelves`}
                  onClick={handleMerge}
                >
                  <Merge className="h-3.5 w-3.5" />
                </button>
              )}
              {activeShelf && filter !== "later" && (
                <>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Shelf options"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShelfMenuOpen((v) => !v)
                      setRowMenu(null)
                      setMoveMenu(null)
                    }}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                  {shelfMenuOpen && (
                    <div
                      className="panel absolute right-0 top-9 z-30 min-w-[150px] p-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {editingFolder === filter ? (
                        <input
                          className="mb-1 h-7 w-full rounded-sm border px-2 text-xs outline-none"
                          style={{
                            borderColor: "var(--line)",
                            background: "var(--paper)",
                            color: "var(--ink)",
                          }}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => {
                            commitRename(filter)
                            setShelfMenuOpen(false)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              commitRename(filter)
                              setShelfMenuOpen(false)
                            }
                            if (e.key === "Escape") setEditingFolder(null)
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className="menu-item"
                          onClick={() => {
                            setEditName(activeShelf.name)
                            setEditingFolder(filter)
                          }}
                        >
                          Rename
                        </button>
                      )}
                      <button
                        type="button"
                        className="menu-item"
                        onClick={async () => {
                          await togglePin(filter)
                          setShelfMenuOpen(false)
                          await loadGroups()
                        }}
                      >
                        {activeShelf.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        type="button"
                        className="menu-item"
                        style={{ color: "var(--danger)" }}
                        onClick={() => {
                          setShelfMenuOpen(false)
                          setConfirmDelete(filter)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main
        className="app-tabs"
        onClick={() => {
          setMoveMenu(null)
          setRowMenu(null)
          setShelfMenuOpen(false)
        }}
      >
        {view === "settings" ? (
          <SettingsPage
            prefs={prefs}
            user={user}
            syncState={isSyncing ? "syncing" : syncState}
            syncHint={syncHint}
            onBack={() => setView("shelf")}
            onPrefs={updatePrefs}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onSync={handleSync}
            onExport={handleExport}
            onImport={handleImport}
            authLoading={isAuthLoading}
            syncing={isSyncing}
          />
        ) : (
          <>
            {!prefs.onboardingDismissed && (
              <Onboarding onDismiss={() => updatePrefs({ onboardingDismissed: true })} />
            )}

            {visibleTabs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <CubeMark idle className="text-[var(--blue)] h-10 w-10" />
                <p className="font-display text-sm" style={{ color: "var(--ink)" }}>
                  {query
                    ? "No matches"
                    : filter === "later"
                      ? "Nothing in Later"
                      : "Empty shelf"}
                </p>
                <p className="max-w-xs text-xs" style={{ color: "var(--ink-3)" }}>
                  {query
                    ? "Try another search."
                    : "Park open tabs here — your daily inbox for “open later”."}
                </p>
                {!query && openTabs.length > 0 && (
                  <button type="button" className="btn-solid" onClick={() => setShowPark(true)}>
                    Park open tabs
                  </button>
                )}
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-0.5">
                {visibleTabs.map((t) => {
                  const menuOpen =
                    rowMenu?.groupId === t.groupId && rowMenu.index === t.index
                  const moveOpen =
                    moveMenu?.groupId === t.groupId && moveMenu.index === t.index
                  return (
                    <div
                      key={`${t.groupId}-${t.index}-${t.url}`}
                      className="row-item relative"
                      onDoubleClick={async () => {
                        await restoreSingleTab(t.url)
                        toast("Opened", "success")
                      }}
                    >
                      {t.favIconUrl ? (
                        <img src={t.favIconUrl} alt="" className="h-4 w-4 shrink-0" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 bg-[var(--paper-3)]" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.title || hostOf(t.url)}</p>
                        <p className="truncate text-[11px]" style={{ color: "var(--ink-3)" }}>
                          {filter === "all" ? `${t.groupName} · ` : ""}
                          {hostOf(t.url)}
                        </p>
                      </div>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Open"
                          onClick={async () => {
                            await restoreSingleTab(t.url)
                            toast("Opened", "success")
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="More"
                          onClick={(e) => {
                            e.stopPropagation()
                            setRowMenu(menuOpen ? null : { groupId: t.groupId, index: t.index })
                            setMoveMenu(null)
                            setShelfMenuOpen(false)
                          }}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {menuOpen && (
                        <div
                          className="panel absolute right-0 top-9 z-30 min-w-[150px] p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="menu-item"
                            onClick={async () => {
                              await navigator.clipboard.writeText(t.url)
                              setRowMenu(null)
                              toast("Copied", "success")
                            }}
                          >
                            <Copy className="h-3 w-3" /> Copy link
                          </button>
                          <button
                            type="button"
                            className="menu-item"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMoveMenu({ groupId: t.groupId, index: t.index })
                              setRowMenu(null)
                            }}
                          >
                            <FolderInput className="h-3 w-3" /> Move to…
                          </button>
                          <button
                            type="button"
                            className="menu-item"
                            style={{ color: "var(--danger)" }}
                            onClick={async () => {
                              await deleteTabFromGroup(t.groupId, t.index)
                              setRowMenu(null)
                              toast("Removed", "info")
                              await loadGroups()
                            }}
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      )}
                      {moveOpen && (
                        <div
                          className="panel absolute right-0 top-9 z-30 min-w-[160px] p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p
                            className="px-2 py-1 text-[10px] font-bold uppercase"
                            style={{ color: "var(--ink-3)" }}
                          >
                            Move to
                          </p>
                          {groups
                            .filter((g) => g.id !== t.groupId)
                            .map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                className="menu-item"
                                onClick={async () => {
                                  await moveTabToGroup(t.groupId, t.index, g.id)
                                  setMoveMenu(null)
                                  toast(`Moved to ${g.name}`, "success")
                                  await loadGroups()
                                }}
                              >
                                {g.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {visibleTabs.map((t) => (
                  <button
                    key={`${t.groupId}-${t.index}-${t.url}`}
                    type="button"
                    className="grid-item text-left"
                    onClick={async () => {
                      await restoreSingleTab(t.url)
                      toast("Opened", "success")
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {t.favIconUrl ? (
                        <img src={t.favIconUrl} alt="" className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <span className="mt-0.5 h-4 w-4 shrink-0 bg-[var(--paper-3)]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{t.title || hostOf(t.url)}</p>
                        <p className="truncate text-[11px]" style={{ color: "var(--ink-3)" }}>
                          {filter === "all" ? `${t.groupName} · ` : ""}
                          {hostOf(t.url)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Credits />

      {showPark && (
        <ParkModal
          openTabs={openTabs}
          groups={groups}
          closeOnPark={closeOnPark}
          onCloseOnParkChange={(v) => updatePrefs({ closeOnPark: v })}
          onClose={() => setShowPark(false)}
          onPark={handlePark}
          onCloseDuplicates={handleCloseDuplicates}
          onSortBySite={handleSortBySite}
          dupeCount={dupeCount}
          busy={isParking}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete shelf?"
        description="This removes the shelf and its parked tabs from this device (and syncs the delete when signed in)."
        confirmLabel="Delete"
        dangerous
        onConfirm={async () => {
          if (!confirmDelete || confirmDelete === LATER_SHELF_ID) return
          await deleteGroup(confirmDelete)
          setConfirmDelete(null)
          setFilter("later")
          toast("Deleted", "info")
          await loadGroups()
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}
