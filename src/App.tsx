"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ToastProvider, useToast } from "@/components/shared/Toast"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Input } from "@/components/ui/input"
import {
  LayoutGrid,
  List,
  Search,
  Plus,
  RotateCcw,
  Trash2,
  Pin,
  LogOut,
  RefreshCw,
  ExternalLink,
  Copy,
  X,
  Sparkles,
  Merge,
  Moon,
  Sun,
  Palette,
} from "lucide-react"
import {
  googleLogin,
  logout,
  getAuthState,
  getGroups,
  saveTabsAsGroup,
  appendTabsToGroup,
  renameGroup,
  togglePin,
  deleteGroup,
  deleteTabFromGroup,
  restoreTabs,
  restoreSingleTab,
  closeTabs,
  manualSync,
  mergeGroups,
  findDuplicateOpenTabs,
  suggestDomainGroups,
  type TabGroup,
  type TabData,
  type AuthUser,
} from "@/lib/api"

type ViewMode = "list" | "grid"
type ShelfFilter = "all" | string
type ThemeMode = "light" | "dark"
type ThemeAccent = "coral" | "mint" | "sky" | "amber"

interface OpenTab {
  id: string
  url: string
  title: string
  favIconUrl?: string
}

const ACCENTS: { id: ThemeAccent; label: string; swatch: string }[] = [
  { id: "coral", label: "Coral", swatch: "#ff4d3a" },
  { id: "mint", label: "Mint", swatch: "#0d9488" },
  { id: "sky", label: "Sky", swatch: "#0284c7" },
  { id: "amber", label: "Amber", swatch: "#d97706" },
]

declare const chrome: typeof globalThis.chrome

function Fav({ url, title }: { url?: string | null; title?: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-4 w-4 rounded object-contain"
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.display = "none"
        }}
      />
    )
  }
  return (
    <span
      className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold"
      style={{ background: "var(--pop-soft)", color: "var(--pop)" }}
    >
      {(title || "?").slice(0, 1).toUpperCase()}
    </span>
  )
}

function AppInner() {
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([])
  const [groups, setGroups] = useState<TabGroup[]>([])
  const [filter, setFilter] = useState<ShelfFilter>("all")
  const [view, setView] = useState<ViewMode>("list")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [showSave, setShowSave] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [saveTarget, setSaveTarget] = useState("new")
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [showTheme, setShowTheme] = useState(false)
  const [mode, setMode] = useState<ThemeMode>("light")
  const [accent, setAccent] = useState<ThemeAccent>("coral")
  const [confirm, setConfirm] = useState<{
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)

  const applyTheme = useCallback((m: ThemeMode, a: ThemeAccent) => {
    document.documentElement.setAttribute("data-mode", m)
    document.documentElement.setAttribute("data-accent", a)
    document.documentElement.classList.toggle("dark", m === "dark")
  }, [])

  useEffect(() => {
    applyTheme(mode, accent)
  }, [mode, accent, applyTheme])

  useEffect(() => {
    chrome.storage.local.get(["themeMode", "themeAccent", "viewMode"]).then((r) => {
      if (r.themeMode === "light" || r.themeMode === "dark") setMode(r.themeMode)
      if (["coral", "mint", "sky", "amber"].includes(r.themeAccent)) setAccent(r.themeAccent)
      if (r.viewMode === "grid" || r.viewMode === "list") setView(r.viewMode)
    })
  }, [])

  const persistTheme = (m: ThemeMode, a: ThemeAccent) => {
    setMode(m)
    setAccent(a)
    chrome.storage.local.set({ themeMode: m, themeAccent: a })
  }

  const loadGroups = useCallback(async () => {
    try {
      setGroups(await getGroups())
    } catch (e) {
      console.error(e)
    }
  }, [])

  const loadOpenTabs = useCallback(async () => {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      setOpenTabs(
        tabs
          .filter(
            (t) =>
              t.url &&
              !t.url.startsWith("chrome://") &&
              !t.url.startsWith("chrome-extension://") &&
              !t.url.startsWith("edge://") &&
              !t.url.startsWith("brave://")
          )
          .map((t) => ({
            id: String(t.id),
            url: t.url || "",
            title: t.title || "Untitled",
            favIconUrl: t.favIconUrl,
          }))
      )
    } catch (e) {
      console.error(e)
    }
  }, [])

  const initAuth = useCallback(async () => {
    try {
      setIsAuthLoading(true)
      const state = await getAuthState()
      setIsAuthenticated(state.loggedIn)
      setUser(state.user)
    } finally {
      setIsAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    initAuth()
    loadGroups()
    loadOpenTabs()
    const onStorage = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "local" && changes.tabGroups) {
        setGroups(((changes.tabGroups.newValue || []) as TabGroup[]).filter((g) => !g.deleted))
      }
      if (area === "local" && (changes.authToken || changes.user)) initAuth()
    }
    chrome.storage.onChanged.addListener(onStorage)
    return () => chrome.storage.onChanged.removeListener(onStorage)
  }, [initAuth, loadGroups, loadOpenTabs])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && openTabs.length) {
        e.preventDefault()
        setSaveName("")
        setSaveTarget("new")
        setShowSave(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openTabs.length])

  const setViewMode = (v: ViewMode) => {
    setView(v)
    chrome.storage.local.set({ viewMode: v })
  }

  const sortedGroups = useMemo(
    () =>
      [...groups].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }),
    [groups]
  )

  const allShelfTabs = useMemo(() => {
    const items: Array<{
      key: string
      groupId: string
      groupName: string
      tabIndex: number
      tab: TabData
    }> = []
    for (const g of sortedGroups) {
      g.tabs.forEach((tab, tabIndex) => {
        items.push({ key: `${g.id}-${tabIndex}`, groupId: g.id, groupName: g.name, tabIndex, tab })
      })
    }
    return items
  }, [sortedGroups])

  const visibleTabs = useMemo(() => {
    let items = allShelfTabs
    if (filter !== "all") items = items.filter((i) => i.groupId === filter)
    if (query.trim()) {
      const q = query.toLowerCase()
      items = items.filter(
        (i) =>
          i.tab.title.toLowerCase().includes(q) ||
          i.tab.url.toLowerCase().includes(q) ||
          i.groupName.toLowerCase().includes(q)
      )
    }
    return items
  }, [allShelfTabs, filter, query])

  const duplicates = useMemo(() => findDuplicateOpenTabs(openTabs), [openTabs])
  const duplicateCount = useMemo(() => {
    let n = 0
    for (const ids of duplicates.values()) n += ids.length - 1
    return n
  }, [duplicates])

  const domainSuggestions = useMemo(
    () =>
      suggestDomainGroups(
        openTabs.map((t) => ({ url: t.url, title: t.title, favIconUrl: t.favIconUrl }))
      ).filter((d) => d.tabs.length >= 2),
    [openTabs]
  )

  const activeFolder = filter === "all" ? null : groups.find((g) => g.id === filter)

  const handleLogin = async () => {
    try {
      setIsAuthLoading(true)
      const data = await googleLogin()
      setIsAuthenticated(true)
      setUser(data.user)
      toast("Signed in", "success")
      setTimeout(loadGroups, 800)
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 140) : "Sign-in failed", "error")
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    setIsAuthenticated(false)
    setUser(null)
    toast("Signed out", "info")
  }

  const handleSync = async () => {
    if (!isAuthenticated) {
      toast("Sign in to sync", "info")
      return
    }
    setIsSyncing(true)
    try {
      setGroups(await manualSync())
      toast("Synced", "success")
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sync failed", "error")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSave = async () => {
    if (!openTabs.length) return
    setIsLoading(true)
    try {
      const payload = openTabs.map((t, i) => ({
        url: t.url,
        title: t.title,
        favIconUrl: t.favIconUrl,
        position: i,
      }))
      if (saveTarget !== "new") {
        await appendTabsToGroup(saveTarget, payload)
        toast("Added to folder", "success")
      } else {
        const name =
          saveName.trim() ||
          `Shelf ${new Date().toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}`
        await saveTabsAsGroup(payload, name)
        toast(`Saved “${name}”`, "success")
      }
      setShowSave(false)
      await loadGroups()
      const ids = openTabs.map((t) => Number.parseInt(t.id, 10)).filter((n) => !isNaN(n))
      if (ids.length > 1) await closeTabs(ids.slice(0, -1))
      setTimeout(loadOpenTabs, 250)
    } catch {
      toast("Couldn't save", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSmartGroup = async () => {
    if (!domainSuggestions.length) return
    setIsLoading(true)
    try {
      for (const s of domainSuggestions) await saveTabsAsGroup(s.tabs, s.domain)
      await loadGroups()
      toast(`Grouped into ${domainSuggestions.length} folders`, "success")
      const ids = openTabs.map((t) => Number.parseInt(t.id, 10)).filter((n) => !isNaN(n))
      if (ids.length > 1) await closeTabs(ids.slice(0, -1))
      setTimeout(loadOpenTabs, 250)
    } catch {
      toast("Couldn't auto-group", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMergeSelected = async () => {
    if (selected.size < 2) return
    const name = window.prompt("Merged folder name:", "Combined")
    if (!name?.trim()) return
    setGroups(await mergeGroups([...selected], name.trim()))
    setSelected(new Set())
    setFilter("all")
    toast("Merged", "success")
  }

  const handleCloseDuplicates = async () => {
    const toClose: number[] = []
    for (const ids of duplicates.values()) {
      for (let i = 1; i < ids.length; i++) {
        const n = Number.parseInt(ids[i], 10)
        if (!isNaN(n)) toClose.push(n)
      }
    }
    if (!toClose.length) return
    await closeTabs(toClose)
    toast(`Closed ${toClose.length}`, "success")
    setTimeout(loadOpenTabs, 200)
  }

  const commitRename = async (id: string) => {
    const name = editName.trim()
    setEditingFolder(null)
    if (!name) return
    await renameGroup(id, name)
    await loadGroups()
  }

  return (
    <div className="app-shell">
      {/* —— Compact chrome (~20%) —— */}
      <header className="app-chrome space-y-2.5">
        <div className="flex items-center gap-2">
          <h1 className="font-display shrink-0 text-base font-extrabold tracking-tight sm:text-lg">
            TooMany<span style={{ color: "var(--pop)" }}>Tabs</span>
          </h1>

          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: "var(--ink-3)" }}
            />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tabs…"
              className="h-8 rounded-full border pl-8 pr-3 text-xs shadow-none"
              style={{
                background: "var(--paper-2)",
                borderColor: "var(--line)",
                color: "var(--ink)",
              }}
            />
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              className="icon-btn"
              style={{
                background: view === "list" ? "var(--pop-soft)" : undefined,
                color: view === "list" ? "var(--pop)" : undefined,
              }}
              onClick={() => setViewMode("list")}
              aria-label="List"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="icon-btn"
              style={{
                background: view === "grid" ? "var(--pop-soft)" : undefined,
                color: view === "grid" ? "var(--pop)" : undefined,
              }}
              onClick={() => setViewMode("grid")}
              aria-label="Grid"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>

            <div className="relative">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowTheme((v) => !v)}
                aria-label="Theme"
                title="Theme"
              >
                <Palette className="h-3.5 w-3.5" />
              </button>
              {showTheme && (
                <div
                  className="absolute right-0 top-9 z-40 w-48 rounded-2xl border p-3 shadow-lg"
                  style={{
                    background: "var(--paper-2)",
                    borderColor: "var(--line-2)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                  }}
                >
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
                    Mode
                  </p>
                  <div className="mb-3 flex gap-1">
                    <button
                      type="button"
                      className="btn-ghost flex-1 !h-7 !text-[11px]"
                      style={{
                        background: mode === "light" ? "var(--pop-soft)" : undefined,
                        borderColor: mode === "light" ? "var(--pop)" : undefined,
                        color: mode === "light" ? "var(--pop)" : undefined,
                      }}
                      onClick={() => persistTheme("light", accent)}
                    >
                      <Sun className="h-3 w-3" /> Light
                    </button>
                    <button
                      type="button"
                      className="btn-ghost flex-1 !h-7 !text-[11px]"
                      style={{
                        background: mode === "dark" ? "var(--pop-soft)" : undefined,
                        borderColor: mode === "dark" ? "var(--pop)" : undefined,
                        color: mode === "dark" ? "var(--pop)" : undefined,
                      }}
                      onClick={() => persistTheme("dark", accent)}
                    >
                      <Moon className="h-3 w-3" /> Dark
                    </button>
                  </div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
                    Accent
                  </p>
                  <div className="flex gap-2">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="theme-dot"
                        data-active={accent === a.id}
                        style={{ background: a.swatch }}
                        title={a.label}
                        aria-label={a.label}
                        onClick={() => persistTheme(mode, a.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!isAuthLoading &&
              (isAuthenticated ? (
                <>
                  <button type="button" className="icon-btn" onClick={handleSync} title="Sync" disabled={isSyncing}>
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  </button>
                  <button type="button" className="icon-btn" onClick={handleLogout} title={user?.email || "Sign out"}>
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button type="button" className="btn-ghost !px-2.5" onClick={handleLogin}>
                  Sign in
                </button>
              ))}
          </div>
        </div>

        {/* Open strip — compact */}
        {openTabs.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl px-2.5 py-1.5"
            style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}
          >
            <span className="text-xs font-bold">
              {openTabs.length} <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>open</span>
            </span>
            {duplicateCount > 0 && (
              <button
                type="button"
                className="text-[11px] font-semibold"
                style={{ color: "var(--pop)" }}
                onClick={handleCloseDuplicates}
              >
                · {duplicateCount} dupes
              </button>
            )}
            <div className="ml-auto flex gap-1.5">
              {domainSuggestions.length > 0 && (
                <button type="button" className="btn-ghost" onClick={handleSmartGroup} disabled={isLoading}>
                  <Sparkles className="h-3 w-3" />
                  Auto
                </button>
              )}
              <button
                type="button"
                className="btn-solid"
                onClick={() => {
                  setSaveName("")
                  setSaveTarget("new")
                  setShowSave(true)
                }}
                disabled={isLoading}
              >
                <Plus className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          </div>
        )}

        {/* Folder tabs */}
        <div className="flex items-center gap-3 overflow-x-auto border-b pb-1.5" style={{ borderColor: "var(--line)" }}>
          <button type="button" className="filter-tab" data-active={filter === "all"} onClick={() => setFilter("all")}>
            All {allShelfTabs.length}
          </button>
          {sortedGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              className="filter-tab inline-flex items-center gap-1"
              data-active={filter === g.id}
              onClick={() => setFilter(g.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setSelected((prev) => {
                  const next = new Set(prev)
                  if (next.has(g.id)) next.delete(g.id)
                  else next.add(g.id)
                  return next
                })
              }}
            >
              {g.pinned && <Pin className="h-2.5 w-2.5" style={{ color: "var(--pop)" }} />}
              {selected.has(g.id) && <span style={{ color: "var(--pop)" }}>✓</span>}
              {g.name}
              <span style={{ opacity: 0.55 }}>{g.tabs.length}</span>
            </button>
          ))}
          {selected.size >= 2 && (
            <button type="button" className="btn-ghost ml-auto !h-6" onClick={handleMergeSelected}>
              <Merge className="h-3 w-3" />
              Merge
            </button>
          )}
          {activeFolder && (
            <div className="ml-auto flex shrink-0 gap-0.5">
              <button
                type="button"
                className="icon-btn"
                title="Rename"
                onClick={() => {
                  setEditingFolder(activeFolder.id)
                  setEditName(activeFolder.name)
                }}
              >
                <span className="text-[10px] font-bold">Aa</span>
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Restore"
                onClick={async () => {
                  await restoreTabs(activeFolder.tabs.map((t) => t.url))
                  toast("Opened", "success")
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Pin"
                onClick={async () => {
                  await togglePin(activeFolder.id)
                  await loadGroups()
                }}
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Delete"
                onClick={() =>
                  setConfirm({
                    title: `Delete “${activeFolder.name}”?`,
                    description: `${activeFolder.tabs.length} tabs will leave this shelf.`,
                    confirmLabel: "Delete",
                    onConfirm: async () => {
                      await deleteGroup(activeFolder.id)
                      setFilter("all")
                      await loadGroups()
                      toast("Deleted", "info")
                    },
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {editingFolder && (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => commitRename(editingFolder)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename(editingFolder)
              if (e.key === "Escape") setEditingFolder(null)
            }}
            className="h-7 w-full rounded-lg border bg-transparent px-2 text-sm font-semibold outline-none"
            style={{ borderColor: "var(--pop)", color: "var(--ink)" }}
          />
        )}

        {filter === "all" && visibleTabs.length > 0 && (
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
              {visibleTabs.length} tabs
            </p>
            <button
              type="button"
              className="text-[11px] font-semibold"
              style={{ color: "var(--ok)" }}
              onClick={async () => {
                await restoreTabs(visibleTabs.map((i) => i.tab.url))
                toast("Restored", "success")
              }}
            >
              Restore all
            </button>
          </div>
        )}
      </header>

      {/* —— Tabs (~80%) —— */}
      <main className="app-tabs" onClick={() => showTheme && setShowTheme(false)}>
        {visibleTabs.length === 0 && (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 text-center">
            <p className="font-display text-lg font-bold">
              {query ? "No matches" : "Empty shelf"}
            </p>
            <p className="mt-1 max-w-xs text-xs" style={{ color: "var(--ink-3)" }}>
              {query ? "Try another search." : "Save open tabs — they live here until you need them."}
            </p>
            {openTabs.length > 0 && !query && (
              <button type="button" className="btn-solid mt-4" onClick={() => setShowSave(true)}>
                <Plus className="h-3.5 w-3.5" />
                Save {openTabs.length}
              </button>
            )}
          </div>
        )}

        {visibleTabs.length > 0 && view === "list" && (
          <div>
            {visibleTabs.map((item) => (
              <div key={item.key} className="row-item group">
                <Fav url={item.tab.favIconUrl} title={item.tab.title} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold leading-tight">
                    {item.tab.title || "Untitled"}
                  </p>
                  <p className="truncate text-[11px]" style={{ color: "var(--ink-3)" }}>
                    {filter === "all" && (
                      <span style={{ color: "var(--pop)" }}>{item.groupName} · </span>
                    )}
                    {item.tab.url.replace(/^https?:\/\//, "")}
                  </p>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Copy"
                    onClick={() => {
                      navigator.clipboard?.writeText(item.tab.url)
                      toast("Copied", "success")
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Open"
                    onClick={() => restoreSingleTab(item.tab.url)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Remove"
                    onClick={async () => {
                      setGroups(await deleteTabFromGroup(item.groupId, item.tabIndex))
                      toast("Removed", "info")
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {visibleTabs.length > 0 && view === "grid" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleTabs.map((item) => (
              <div key={item.key} className="grid-item">
                <div className="flex items-start gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--pop-soft)" }}
                  >
                    <Fav url={item.tab.favIconUrl} title={item.tab.title} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-semibold leading-snug">
                      {item.tab.title || "Untitled"}
                    </p>
                    {filter === "all" && (
                      <p className="mt-0.5 text-[10px] font-bold" style={{ color: "var(--pop)" }}>
                        {item.groupName}
                      </p>
                    )}
                  </div>
                </div>
                <p className="truncate text-[10px]" style={{ color: "var(--ink-3)" }}>
                  {item.tab.url.replace(/^https?:\/\//, "")}
                </p>
                <div className="mt-auto flex gap-1.5">
                  <button
                    type="button"
                    className="btn-ghost flex-1 !h-7"
                    onClick={() => restoreSingleTab(item.tab.url)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}
                    onClick={async () => setGroups(await deleteTabFromGroup(item.groupId, item.tabIndex))}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showSave && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-3 backdrop-blur-[2px] sm:items-center">
          <div
            className="w-full max-w-sm rounded-2xl border p-4"
            style={{
              background: "var(--paper-2)",
              borderColor: "var(--line-2)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
            }}
          >
            <h3 className="font-display text-lg font-bold">Save to shelf</h3>
            <p className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
              New folder or add to an existing one.
            </p>

            <select
              value={saveTarget}
              onChange={(e) => setSaveTarget(e.target.value)}
              className="mt-3 h-9 w-full rounded-xl border px-2.5 text-sm outline-none"
              style={{ background: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
            >
              <option value="new">New folder</option>
              {sortedGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {saveTarget === "new" && (
              <>
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="College, Work, Later…"
                  className="mt-2 h-9 rounded-xl border text-sm"
                  style={{ background: "var(--paper)", borderColor: "var(--line)" }}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {["College", "Work", "Reading", "Later"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="text-[11px] font-semibold"
                      style={{ color: "var(--pop)" }}
                      onClick={() => setSaveName(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setShowSave(false)}>
                Cancel
              </button>
              <button type="button" className="btn-solid flex-1" onClick={handleSave} disabled={isLoading}>
                {isLoading ? "…" : `Save ${openTabs.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ""}
        description={confirm?.description || ""}
        confirmLabel={confirm?.confirmLabel}
        dangerous
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm?.onConfirm()}
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
