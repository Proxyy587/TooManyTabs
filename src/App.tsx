"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ToastProvider, useToast } from "@/components/shared/Toast"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  LayoutGrid,
  List,
  Search,
  Plus,
  FolderPlus,
  RotateCcw,
  Trash2,
  Pin,
  Cloud,
  HardDrive,
  LogOut,
  RefreshCw,
  ExternalLink,
  Copy,
  X,
  Sparkles,
  ChevronRight,
  Merge,
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

interface OpenTab {
  id: string
  url: string
  title: string
  favIconUrl?: string
}

declare const chrome: typeof globalThis.chrome

function favicon(url?: string | null, title?: string) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-5 w-5 rounded-md object-contain"
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.display = "none"
        }}
      />
    )
  }
  return (
    <span
      className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold"
      style={{ background: "var(--tmt-accent-soft)", color: "var(--tmt-accent)" }}
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
  const [saveTarget, setSaveTarget] = useState<string>("new")
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [confirm, setConfirm] = useState<{
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)

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

    chrome.storage.local.get(["viewMode"]).then((r) => {
      if (r.viewMode === "grid" || r.viewMode === "list") setView(r.viewMode)
    })

    const onStorage = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "local" && changes.tabGroups) {
        const next = (changes.tabGroups.newValue || []) as TabGroup[]
        setGroups(next.filter((g) => !g.deleted))
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

  const setViewMode = (mode: ViewMode) => {
    setView(mode)
    chrome.storage.local.set({ viewMode: mode })
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
      updatedAt: string
    }> = []
    for (const g of sortedGroups) {
      g.tabs.forEach((tab, tabIndex) => {
        items.push({
          key: `${g.id}-${tabIndex}`,
          groupId: g.id,
          groupName: g.name,
          tabIndex,
          tab,
          updatedAt: g.updatedAt,
        })
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
        openTabs.map((t) => ({
          url: t.url,
          title: t.title,
          favIconUrl: t.favIconUrl,
        }))
      ).filter((d) => d.tabs.length >= 2),
    [openTabs]
  )

  const handleLogin = async () => {
    try {
      setIsAuthLoading(true)
      const data = await googleLogin()
      setIsAuthenticated(true)
      setUser(data.user)
      toast("Welcome back — syncing your shelf", "success")
      setTimeout(loadGroups, 800)
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 160) : "Sign-in failed", "error")
      try {
        console.info("[TooManyTabs] Redirect URI:", chrome.identity.getRedirectURL())
      } catch {
        /* ignore */
      }
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    setIsAuthenticated(false)
    setUser(null)
    toast("Signed out — shelf stays on this device", "info")
  }

  const handleSync = async () => {
    if (!isAuthenticated) {
      toast("Sign in to sync across devices", "info")
      return
    }
    setIsSyncing(true)
    try {
      setGroups(await manualSync())
      toast("Shelf is up to date", "success")
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
        const name = saveName.trim() || `Shelf ${new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
        await saveTabsAsGroup(payload, name)
        toast(`Saved “${name}”`, "success")
      }

      setShowSave(false)
      await loadGroups()

      const ids = openTabs.map((t) => Number.parseInt(t.id, 10)).filter((n) => !isNaN(n))
      if (ids.length > 1) await closeTabs(ids.slice(0, -1))
      setTimeout(loadOpenTabs, 250)
    } catch {
      toast("Couldn't save tabs", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSmartGroup = async () => {
    if (!domainSuggestions.length) return
    setIsLoading(true)
    try {
      for (const suggestion of domainSuggestions) {
        await saveTabsAsGroup(suggestion.tabs, suggestion.domain)
      }
      await loadGroups()
      toast(`Created ${domainSuggestions.length} folders by site`, "success")
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
    if (selected.size < 2) {
      toast("Select 2+ folders to merge", "info")
      return
    }
    const name = window.prompt("Name for the merged folder:", "Combined")
    if (!name?.trim()) return
    try {
      setGroups(await mergeGroups([...selected], name.trim()))
      setSelected(new Set())
      setFilter("all")
      toast("Folders merged", "success")
    } catch {
      toast("Couldn't merge", "error")
    }
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
    toast(`Closed ${toClose.length} duplicates`, "success")
    setTimeout(loadOpenTabs, 200)
  }

  const toggleFolderSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const commitRename = async (id: string) => {
    const name = editName.trim()
    setEditingFolder(null)
    if (!name) return
    await renameGroup(id, name)
    await loadGroups()
  }

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:flex-row lg:gap-7">
        {/* Sidebar */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="tmt-panel sticky top-5 p-4 sm:p-5">
            <div className="mb-5 flex items-start gap-3">
              <img src="./icon.svg" alt="" className="h-10 w-10 rounded-xl" />
              <div className="min-w-0">
                <h1 className="font-display text-xl font-semibold tracking-tight" style={{ color: "var(--tmt-ink)" }}>
                  TooManyTabs
                </h1>
                <p className="mt-0.5 text-xs" style={{ color: "var(--tmt-ink-faint)" }}>
                  Your cozy tab shelf
                </p>
              </div>
            </div>

            <div
              className="mb-4 flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-medium"
              style={{
                background: isAuthenticated ? "var(--tmt-accent-soft)" : "var(--tmt-bg-deep)",
                color: isAuthenticated ? "var(--tmt-accent)" : "var(--tmt-ink-soft)",
              }}
            >
              {isAuthenticated ? <Cloud className="h-3.5 w-3.5" /> : <HardDrive className="h-3.5 w-3.5" />}
              {isAuthenticated ? "Synced" : "This device"}
            </div>

            <nav className="space-y-1">
              <button
                type="button"
                className="tmt-chip w-full justify-between"
                data-active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                <span>All tabs</span>
                <span className="opacity-70">{allShelfTabs.length}</span>
              </button>

              {sortedGroups.map((g) => (
                <div key={g.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    className="tmt-chip min-w-0 flex-1 justify-between"
                    data-active={filter === g.id}
                    onClick={() => setFilter(g.id)}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {g.pinned && <Pin className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{g.name}</span>
                    </span>
                    <span className="opacity-70">{g.tabs.length}</span>
                  </button>
                  <button
                    type="button"
                    title="Select to merge"
                    onClick={() => toggleFolderSelect(g.id)}
                    className="rounded-lg p-1.5 opacity-0 transition group-hover:opacity-100"
                    style={{
                      color: selected.has(g.id) ? "var(--tmt-accent)" : "var(--tmt-ink-faint)",
                      background: selected.has(g.id) ? "var(--tmt-accent-soft)" : "transparent",
                    }}
                  >
                    <Merge className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </nav>

            {selected.size >= 2 && (
              <Button
                className="mt-3 w-full rounded-xl"
                style={{ background: "var(--tmt-accent)", color: "#fffcf7" }}
                onClick={handleMergeSelected}
              >
                <Merge className="h-4 w-4" />
                Merge {selected.size} folders
              </Button>
            )}

            <div className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: "var(--tmt-line)" }}>
              {!isAuthLoading && (
                isAuthenticated ? (
                  <>
                    <p className="truncate px-1 text-xs" style={{ color: "var(--tmt-ink-faint)" }}>
                      {user?.email}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl border"
                        style={{ borderColor: "var(--tmt-line)", color: "var(--tmt-ink)" }}
                        onClick={handleSync}
                        disabled={isSyncing}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                        Sync
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        onClick={handleLogout}
                        aria-label="Sign out"
                      >
                        <LogOut className="h-4 w-4" style={{ color: "var(--tmt-ink-soft)" }} />
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    className="w-full rounded-xl"
                    style={{ background: "var(--tmt-ink)", color: "#fffcf7" }}
                    onClick={handleLogin}
                    disabled={isAuthLoading}
                  >
                    Sign in with Google
                  </Button>
                )
              )}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 space-y-5 pb-10">
          {/* Open tabs strip */}
          {openTabs.length > 0 && (
            <section className="tmt-panel tmt-enter overflow-hidden p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    {openTabs.length} open now
                  </h2>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--tmt-ink-soft)" }}>
                    Park them on your shelf — reopen anytime
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {domainSuggestions.length > 0 && (
                    <Button
                      variant="outline"
                      className="rounded-xl border"
                      style={{ borderColor: "var(--tmt-line)", color: "var(--tmt-ink)" }}
                      onClick={handleSmartGroup}
                      disabled={isLoading}
                    >
                      <Sparkles className="h-4 w-4" style={{ color: "var(--tmt-play)" }} />
                      Auto-group by site
                    </Button>
                  )}
                  <Button
                    className="rounded-xl"
                    style={{ background: "var(--tmt-accent)", color: "#fffcf7" }}
                    onClick={() => {
                      setSaveName("")
                      setSaveTarget("new")
                      setShowSave(true)
                    }}
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4" />
                    Save to shelf
                  </Button>
                </div>
              </div>

              {duplicateCount > 0 && (
                <div
                  className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2.5"
                  style={{ background: "var(--tmt-play-soft)" }}
                >
                  <p className="text-sm" style={{ color: "var(--tmt-ink)" }}>
                    {duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""} open
                  </p>
                  <button
                    type="button"
                    className="text-sm font-medium"
                    style={{ color: "var(--tmt-play)" }}
                    onClick={handleCloseDuplicates}
                  >
                    Close extras
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--tmt-ink-faint)" }}
              />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your shelf…"
                className="h-11 rounded-2xl border pl-10 pr-12"
                style={{
                  background: "var(--tmt-surface)",
                  borderColor: "var(--tmt-line)",
                  color: "var(--tmt-ink)",
                  boxShadow: "var(--tmt-shadow)",
                }}
              />
              <kbd
                className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border px-1.5 py-0.5 text-[10px] sm:inline"
                style={{ color: "var(--tmt-ink-faint)", borderColor: "var(--tmt-line)" }}
              >
                ⌘K
              </kbd>
            </div>

            <div
              className="flex rounded-2xl border p-1"
              style={{ background: "var(--tmt-surface)", borderColor: "var(--tmt-line)" }}
            >
              <button
                type="button"
                className="rounded-xl px-3 py-2"
                style={{
                  background: view === "list" ? "var(--tmt-accent-soft)" : "transparent",
                  color: view === "list" ? "var(--tmt-accent)" : "var(--tmt-ink-faint)",
                }}
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-xl px-3 py-2"
                style={{
                  background: view === "grid" ? "var(--tmt-accent-soft)" : "transparent",
                  color: view === "grid" ? "var(--tmt-accent)" : "var(--tmt-ink-faint)",
                }}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {filter !== "all" && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl"
                  title="Restore folder"
                  onClick={async () => {
                    const g = groups.find((x) => x.id === filter)
                    if (!g) return
                    await restoreTabs(g.tabs.map((t) => t.url))
                    toast(`Opened “${g.name}”`, "success")
                  }}
                >
                  <RotateCcw className="h-4 w-4" style={{ color: "var(--tmt-ok)" }} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl"
                  title="Pin"
                  onClick={async () => {
                    await togglePin(filter)
                    await loadGroups()
                  }}
                >
                  <Pin className="h-4 w-4" style={{ color: "var(--tmt-accent)" }} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl"
                  title="Delete folder"
                  onClick={() => {
                    const g = groups.find((x) => x.id === filter)
                    if (!g) return
                    setConfirm({
                      title: `Delete “${g.name}”?`,
                      description: `${g.tabs.length} tabs will leave this shelf.`,
                      confirmLabel: "Delete",
                      onConfirm: async () => {
                        await deleteGroup(g.id)
                        setFilter("all")
                        await loadGroups()
                        toast("Folder removed", "info")
                      },
                    })
                  }}
                >
                  <Trash2 className="h-4 w-4" style={{ color: "var(--tmt-danger)" }} />
                </Button>
              </div>
            )}
          </div>

          {/* Section header */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">
                {filter === "all"
                  ? "Shelf"
                  : editingFolder === filter
                    ? null
                    : groups.find((g) => g.id === filter)?.name || "Folder"}
              </h2>
              {filter !== "all" && editingFolder === filter ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => commitRename(filter)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(filter)
                    if (e.key === "Escape") setEditingFolder(null)
                  }}
                  className="mt-1 rounded-lg border bg-transparent px-2 py-1 font-display text-xl font-semibold outline-none"
                  style={{ borderColor: "var(--tmt-accent)", color: "var(--tmt-ink)" }}
                />
              ) : filter !== "all" ? (
                <button
                  type="button"
                  className="mt-0.5 text-xs"
                  style={{ color: "var(--tmt-ink-faint)" }}
                  onClick={() => {
                    const g = groups.find((x) => x.id === filter)
                    if (!g) return
                    setEditingFolder(filter)
                    setEditName(g.name)
                  }}
                >
                  Double-click title area or click to rename
                </button>
              ) : (
                <p className="text-sm" style={{ color: "var(--tmt-ink-soft)" }}>
                  {visibleTabs.length} tab{visibleTabs.length !== 1 ? "s" : ""} together
                </p>
              )}
            </div>
            {visibleTabs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border"
                style={{ borderColor: "var(--tmt-line)", color: "var(--tmt-ink)" }}
                onClick={async () => {
                  await restoreTabs(visibleTabs.map((i) => i.tab.url))
                  toast(`Restored ${visibleTabs.length}`, "success")
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore visible
              </Button>
            )}
          </div>

          {/* Empty */}
          {visibleTabs.length === 0 && (
            <div className="tmt-panel flex flex-col items-center px-6 py-16 text-center tmt-enter">
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl"
                style={{ background: "var(--tmt-accent-soft)" }}
              >
                <FolderPlus className="h-7 w-7" style={{ color: "var(--tmt-accent)" }} />
              </div>
              <h3 className="font-display text-lg font-semibold">
                {query ? "Nothing matches" : "Your shelf is empty"}
              </h3>
              <p className="mt-2 max-w-sm text-sm" style={{ color: "var(--tmt-ink-soft)" }}>
                {query
                  ? "Try another word, or clear search."
                  : "Save open tabs into folders — or keep them all together. Sign-in is optional."}
              </p>
              {openTabs.length > 0 && !query && (
                <Button
                  className="mt-5 rounded-xl"
                  style={{ background: "var(--tmt-accent)", color: "#fffcf7" }}
                  onClick={() => setShowSave(true)}
                >
                  <Plus className="h-4 w-4" />
                  Save {openTabs.length} tabs
                </Button>
              )}
            </div>
          )}

          {/* List view */}
          {visibleTabs.length > 0 && view === "list" && (
            <div className="tmt-panel space-y-0.5 p-2 tmt-enter">
              {visibleTabs.map((item) => (
                <div key={item.key} className="tmt-tab-row group">
                  {favicon(item.tab.favIconUrl, item.tab.title)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.tab.title || "Untitled"}</p>
                    <p className="truncate text-xs" style={{ color: "var(--tmt-ink-faint)" }}>
                      {filter === "all" && (
                        <span style={{ color: "var(--tmt-accent)" }}>{item.groupName} · </span>
                      )}
                      {item.tab.url}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded-lg p-2 hover:bg-white/60"
                      aria-label="Copy"
                      onClick={() => {
                        navigator.clipboard?.writeText(item.tab.url)
                        toast("Copied", "success")
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" style={{ color: "var(--tmt-ink-soft)" }} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 hover:bg-white/60"
                      aria-label="Open"
                      onClick={() => restoreSingleTab(item.tab.url)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" style={{ color: "var(--tmt-ok)" }} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 hover:bg-white/60"
                      aria-label="Remove"
                      onClick={async () => {
                        setGroups(await deleteTabFromGroup(item.groupId, item.tabIndex))
                        toast("Removed", "info")
                      }}
                    >
                      <X className="h-3.5 w-3.5" style={{ color: "var(--tmt-danger)" }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grid view */}
          {visibleTabs.length > 0 && view === "grid" && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 tmt-enter">
              {visibleTabs.map((item) => (
                <div key={item.key} className="tmt-tab-card group">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "var(--tmt-bg-deep)" }}
                    >
                      {favicon(item.tab.favIconUrl, item.tab.title)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium leading-snug">
                        {item.tab.title || "Untitled"}
                      </p>
                      {filter === "all" && (
                        <p className="mt-1 text-[11px] font-medium" style={{ color: "var(--tmt-accent)" }}>
                          {item.groupName}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="truncate text-xs" style={{ color: "var(--tmt-ink-faint)" }}>
                    {item.tab.url}
                  </p>
                  <div className="mt-auto flex gap-2 pt-1">
                    <button
                      type="button"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
                      style={{ background: "var(--tmt-accent-soft)", color: "var(--tmt-accent)" }}
                      onClick={() => restoreSingleTab(item.tab.url)}
                    >
                      Open <ChevronRight className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="rounded-xl px-3 py-2"
                      style={{ background: "var(--tmt-danger-soft)", color: "var(--tmt-danger)" }}
                      onClick={async () => {
                        setGroups(await deleteTabFromGroup(item.groupId, item.tabIndex))
                      }}
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
      </div>

      {/* Save dialog */}
      {showSave && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-4 sm:items-center">
          <div className="tmt-panel w-full max-w-md p-5 tmt-enter" style={{ boxShadow: "var(--tmt-shadow-lg)" }}>
            <h3 className="font-display text-lg font-semibold">Save to shelf</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--tmt-ink-soft)" }}>
              Keep everything together, or tuck into a folder.
            </p>

            <label className="mt-4 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--tmt-ink-faint)" }}>
              Destination
            </label>
            <select
              value={saveTarget}
              onChange={(e) => setSaveTarget(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border px-3 text-sm outline-none"
              style={{ background: "var(--tmt-bg)", borderColor: "var(--tmt-line)", color: "var(--tmt-ink)" }}
            >
              <option value="new">New folder</option>
              {sortedGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  Add to “{g.name}”
                </option>
              ))}
            </select>

            {saveTarget === "new" && (
              <>
                <label className="mt-3 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--tmt-ink-faint)" }}>
                  Folder name
                </label>
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="College, Work, Reading…"
                  className="mt-1.5 h-11 rounded-xl border"
                  style={{ background: "var(--tmt-bg)", borderColor: "var(--tmt-line)" }}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["College", "Work", "Reading", "Later"].map((p) => (
                    <button key={p} type="button" className="tmt-chip" onClick={() => setSaveName(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border"
                style={{ borderColor: "var(--tmt-line)" }}
                onClick={() => setShowSave(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl"
                style={{ background: "var(--tmt-accent)", color: "#fffcf7" }}
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? "Saving…" : `Save ${openTabs.length}`}
              </Button>
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
        textColor="var(--tmt-ink)"
        deleteColor="var(--tmt-danger)"
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
