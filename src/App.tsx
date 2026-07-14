"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Header } from "@/components/shared/Header"
import { CurrentTabsCard } from "@/components/tabs/CurrentTabsCard"
import { SearchBar } from "@/components/tabs/SearchBar"
import { SavedTabsHeader } from "@/components/tabs/SavedTabsHeader"
import { TabItem } from "@/components/tabs/TabItem"
import { EmptyState } from "@/components/shared/EmptyState"
import { Footer } from "@/components/shared/Footer"
import { FeedbackDialog } from "@/components/shared/FeedbackDialog"
import { SyncBanner } from "@/components/shared/SyncBanner"
import { SaveGroupDialog } from "@/components/shared/SaveGroupDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ToastProvider, useToast } from "@/components/shared/Toast"
import Settings from "./Settings"
import { Button } from "@/components/ui/button"
import {
  Pin,
  Pencil,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Copy,
} from "lucide-react"
import {
  googleLogin,
  logout,
  getAuthState,
  getGroups,
  saveTabsAsGroup,
  renameGroup,
  togglePin,
  deleteGroup,
  deleteTabFromGroup,
  restoreTabs,
  restoreSingleTab,
  closeTabs,
  manualSync,
  findDuplicateOpenTabs,
  type TabGroup,
  type AuthUser,
} from "@/lib/api"

interface OpenTab {
  id: string
  url: string
  title: string
  favIconUrl?: string
}

interface ThemeSettings {
  backgroundColor: string
  textColor: string
  accentColor: string
  deleteColor: string
  restoreColor: string
}

const defaultTheme: ThemeSettings = {
  backgroundColor: "#121214",
  textColor: "#F3F4F6",
  accentColor: "#7DD3FC",
  deleteColor: "#F87171",
  restoreColor: "#34D399",
}

declare const chrome: typeof globalThis.chrome

function AppInner() {
  const { toast } = useToast()
  const [currentTabs, setCurrentTabs] = useState<OpenTab[]>([])
  const [groups, setGroups] = useState<TabGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [showSyncBanner, setShowSyncBanner] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    title: string
    description: string
    confirmLabel: string
    dangerous?: boolean
    onConfirm: () => void
  } | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const loadGroups = useCallback(async () => {
    try {
      const local = await getGroups()
      setGroups(local)
    } catch (error) {
      console.error("Error loading groups:", error)
    }
  }, [])

  const initializeAuth = useCallback(async () => {
    try {
      setIsAuthLoading(true)
      const state = await getAuthState()
      setIsAuthenticated(state.loggedIn)
      setUser(state.user)
    } catch (error) {
      console.error("Error checking auth:", error)
    } finally {
      setIsAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    initializeAuth()
    loadTheme()
    getCurrentTabs()
    loadGroups()

    chrome.storage.local.get(["dismissSyncBanner"]).then((r) => {
      if (!r.dismissSyncBanner) setShowSyncBanner(true)
    })

    const onStorage = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "local" && changes.tabGroups) {
        const next = (changes.tabGroups.newValue || []) as TabGroup[]
        setGroups(next.filter((g) => !g.deleted))
      }
      if (area === "local" && (changes.authToken || changes.user)) {
        initializeAuth()
      }
    }
    chrome.storage.onChanged.addListener(onStorage)
    return () => chrome.storage.onChanged.removeListener(onStorage)
  }, [initializeAuth, loadGroups])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--theme-background", theme.backgroundColor)
    root.style.setProperty("--theme-text", theme.textColor)
    root.style.setProperty("--theme-accent", theme.accentColor)
    root.style.setProperty("--theme-restore", theme.restoreColor)
    root.style.setProperty("--theme-delete", theme.deleteColor)
    document.body.style.backgroundColor = theme.backgroundColor
    document.body.style.color = theme.textColor
  }, [theme])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if (isMod && e.key.toLowerCase() === "s" && currentTabs.length > 0) {
        e.preventDefault()
        setShowSaveDialog(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [currentTabs.length])

  const loadTheme = async () => {
    try {
      const result = await chrome.storage.local.get(["themeSettings"])
      if (result.themeSettings) setTheme(result.themeSettings)
    } catch (error) {
      console.error("Error loading theme:", error)
    }
  }

  const saveTheme = async (newTheme: ThemeSettings) => {
    try {
      await chrome.storage.local.set({ themeSettings: newTheme })
      setTheme(newTheme)
      toast("Theme updated", "success")
    } catch (error) {
      console.error("Error saving theme:", error)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setIsAuthLoading(true)
      const authData = await googleLogin()
      setIsAuthenticated(true)
      setUser(authData.user)
      setShowSyncBanner(false)
      toast("Signed in — syncing your groups…", "success")
      setTimeout(() => loadGroups(), 900)
    } catch (error) {
      console.error("Error logging in:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      toast(errorMessage.slice(0, 180), "error")
      // Also show redirect URI help in console for developers
      try {
        console.info(
          "[TooManyTabs] Add this redirect URI in Google Cloud → Web client:",
          chrome.identity.getRedirectURL()
        )
      } catch (_) {}
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setIsAuthenticated(false)
      setUser(null)
      toast("Signed out. Groups stay on this device.", "info")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleSync = async () => {
    if (!isAuthenticated) {
      toast("Sign in to sync across devices", "info")
      setShowSyncBanner(true)
      return
    }
    setIsSyncing(true)
    try {
      const synced = await manualSync()
      setGroups(synced)
      toast("Everything up to date", "success")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sync failed"
      toast(msg, "error")
    } finally {
      setIsSyncing(false)
    }
  }

  const getCurrentTabs = async () => {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const formatted: OpenTab[] = tabs
        .filter(
          (tab) =>
            tab.url &&
            !tab.url.startsWith("chrome://") &&
            !tab.url.startsWith("chrome-extension://") &&
            !tab.url.startsWith("edge://") &&
            !tab.url.startsWith("brave://")
        )
        .map((tab) => ({
          id: String(tab.id),
          url: tab.url || "",
          title: tab.title || "Untitled",
          favIconUrl: tab.favIconUrl,
        }))
      setCurrentTabs(formatted)
    } catch (error) {
      console.error("Error getting tabs:", error)
    }
  }

  const handleSaveConfirm = async (name: string, shouldClose: boolean) => {
    if (currentTabs.length === 0) return
    setIsLoading(true)
    try {
      await saveTabsAsGroup(
        currentTabs.map((t, i) => ({
          url: t.url,
          title: t.title,
          favIconUrl: t.favIconUrl,
          position: i,
        })),
        name
      )
      await loadGroups()
      setShowSaveDialog(false)
      toast(
        isAuthenticated
          ? `"${name}" saved — syncing…`
          : `"${name}" saved on this device`,
        "success"
      )

      if (shouldClose) {
        const tabIds = currentTabs
          .map((tab) => Number.parseInt(tab.id, 10))
          .filter((id) => !isNaN(id))
        if (tabIds.length > 1) await closeTabs(tabIds.slice(0, -1))
      }

      setTimeout(() => {
        getCurrentTabs()
        setIsLoading(false)
      }, 300)
    } catch (error) {
      console.error("Error saving tabs:", error)
      toast("Couldn't save tabs", "error")
      setIsLoading(false)
    }
  }

  const handleRestoreAll = async () => {
    setIsLoading(true)
    try {
      const urls = groups.flatMap((g) => g.tabs.map((t) => t.url))
      await restoreTabs(urls)
      toast(`Restored ${urls.length} tabs`, "success")
    } catch (error) {
      console.error("Error restoring tabs:", error)
      toast("Couldn't restore tabs", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestoreGroup = async (group: TabGroup) => {
    await restoreTabs(group.tabs.map((t) => t.url))
    toast(`Opened “${group.name}”`, "success")
  }

  const handleRestoreSingle = async (url: string) => {
    try {
      await restoreSingleTab(url)
    } catch (error) {
      console.error("Error restoring tab:", error)
    }
  }

  const handleDeleteTab = async (groupId: string, tabIndex: number) => {
    try {
      const next = await deleteTabFromGroup(groupId, tabIndex)
      setGroups(next)
      toast("Tab removed", "info")
    } catch (error) {
      console.error("Error deleting tab:", error)
      await loadGroups()
    }
  }

  const handleDeleteAll = () => {
    setConfirmState({
      title: "Delete all groups?",
      description: "This removes every saved group from this device. Synced copies on other devices stay until their next sync.",
      confirmLabel: "Delete all",
      dangerous: true,
      onConfirm: async () => {
        setIsLoading(true)
        try {
          for (const group of groups) await deleteGroup(group.id)
          await loadGroups()
          toast("All groups deleted", "info")
        } catch (error) {
          console.error("Error deleting groups:", error)
          toast("Couldn't delete everything", "error")
        } finally {
          setIsLoading(false)
        }
      },
    })
  }

  const commitRename = async (groupId: string) => {
    const name = editingName.trim()
    setEditingGroupId(null)
    if (!name) return
    const current = groups.find((g) => g.id === groupId)
    if (!current || current.name === name) return
    try {
      await renameGroup(groupId, name)
      await loadGroups()
      toast("Renamed", "success")
    } catch (error) {
      console.error("Rename failed:", error)
      toast("Couldn't rename", "error")
    }
  }

  const handleTogglePin = async (groupId: string) => {
    try {
      await togglePin(groupId)
      await loadGroups()
    } catch (error) {
      console.error("Pin toggle failed:", error)
    }
  }

  const handleDeleteGroup = (group: TabGroup) => {
    setConfirmState({
      title: `Delete “${group.name}”?`,
      description: `${group.tabs.length} tab${group.tabs.length !== 1 ? "s" : ""} will be removed from this device.`,
      confirmLabel: "Delete group",
      dangerous: true,
      onConfirm: async () => {
        try {
          await deleteGroup(group.id)
          await loadGroups()
          toast("Group deleted", "info")
        } catch (error) {
          console.error("Delete group failed:", error)
          toast("Couldn't delete group", "error")
        }
      },
    })
  }

  const duplicates = useMemo(
    () => findDuplicateOpenTabs(currentTabs),
    [currentTabs]
  )

  const duplicateCount = useMemo(() => {
    let count = 0
    for (const ids of duplicates.values()) count += ids.length - 1
    return count
  }, [duplicates])

  const handleCloseDuplicates = async () => {
    const toClose: number[] = []
    for (const ids of duplicates.values()) {
      for (let i = 1; i < ids.length; i++) {
        const n = Number.parseInt(ids[i], 10)
        if (!isNaN(n)) toClose.push(n)
      }
    }
    if (toClose.length === 0) return
    await closeTabs(toClose)
    toast(`Closed ${toClose.length} duplicate${toClose.length !== 1 ? "s" : ""}`, "success")
    setTimeout(getCurrentTabs, 200)
  }

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [groups])

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return sortedGroups
    const q = searchQuery.toLowerCase()
    return sortedGroups
      .map((group) => {
        const nameMatch = group.name.toLowerCase().includes(q)
        const matchingTabs = group.tabs.filter(
          (t) =>
            t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)
        )
        if (nameMatch) return group
        if (matchingTabs.length === 0) return null
        return { ...group, tabs: matchingTabs }
      })
      .filter(Boolean) as TabGroup[]
  }, [sortedGroups, searchQuery])

  const totalTabs = useMemo(
    () => groups.reduce((sum, g) => sum + g.tabs.length, 0),
    [groups]
  )

  const filteredTabCount = useMemo(
    () => filteredGroups.reduce((sum, g) => sum + g.tabs.length, 0),
    [filteredGroups]
  )

  const handleCopyUrl = (url: string) => {
    if (navigator?.clipboard && url) {
      navigator.clipboard.writeText(url)
      toast("Link copied", "success")
    }
  }

  const dismissSyncBanner = () => {
    setShowSyncBanner(false)
    chrome.storage.local.set({ dismissSyncBanner: true })
  }

  const defaultGroupName = `Session ${new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`

  return (
    <div
      className="min-h-screen w-full flex justify-center items-start"
      style={{
        backgroundColor: theme.backgroundColor,
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(125,211,252,0.12), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(52,211,153,0.06), transparent)",
        color: theme.textColor,
      }}
    >
      <div className="w-full max-w-4xl px-5 py-4 sm:px-6 sm:py-5">
        <Header
          onSettingsClick={() => setShowSettings(true)}
          textColor={theme.textColor}
          accentColor={theme.accentColor}
          isAuthenticated={isAuthenticated}
          user={user}
          onLoginClick={handleGoogleLogin}
          onLogoutClick={handleLogout}
          onSyncClick={handleSync}
          isAuthLoading={isAuthLoading}
          isSyncing={isSyncing}
          totalGroups={groups.length}
          totalTabs={totalTabs}
        />

        {!isAuthenticated && showSyncBanner && (
          <SyncBanner
            onSignIn={handleGoogleLogin}
            onDismiss={dismissSyncBanner}
            isLoading={isAuthLoading}
            textColor={theme.textColor}
            accentColor={theme.accentColor}
          />
        )}

        <div className="mb-6 space-y-3">
          <CurrentTabsCard
            tabCount={currentTabs.length}
            isLoading={isLoading}
            onSave={() => setShowSaveDialog(true)}
            backgroundColor={theme.backgroundColor}
            textColor={theme.textColor}
            accentColor={theme.accentColor}
          />

          {duplicateCount > 0 && (
            <div
              className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
              style={{
                borderColor: "rgba(248,113,113,0.25)",
                background: "rgba(248,113,113,0.08)",
              }}
            >
              <p className="text-sm" style={{ color: theme.textColor }}>
                <span className="font-medium">{duplicateCount}</span> duplicate tab
                {duplicateCount !== 1 ? "s" : ""} cluttering this window
              </p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl shrink-0"
                onClick={handleCloseDuplicates}
                style={{
                  color: theme.deleteColor,
                  borderColor: "rgba(248,113,113,0.4)",
                }}
              >
                Close extras
              </Button>
            </div>
          )}
        </div>

        <main className="space-y-5">
          {totalTabs > 0 && (
            <>
              <SearchBar
                ref={searchRef}
                value={searchQuery}
                onChange={setSearchQuery}
                backgroundColor="rgba(255,255,255,0.04)"
                textColor={theme.textColor}
              />

              <SavedTabsHeader
                totalTabs={totalTabs}
                filteredCount={filteredTabCount}
                searchQuery={searchQuery}
                isLoading={isLoading}
                onRestoreAll={handleRestoreAll}
                onDeleteAll={handleDeleteAll}
                restoreColor={theme.restoreColor}
                deleteColor={theme.deleteColor}
                textColor={theme.textColor}
              />
            </>
          )}

          {totalTabs === 0 && (
            <EmptyState
              textColor={theme.textColor}
              backgroundColor={theme.backgroundColor}
              accentColor={theme.accentColor}
              onSaveClick={() => setShowSaveDialog(true)}
              canSave={currentTabs.length > 0}
              tabCount={currentTabs.length}
            />
          )}

          {filteredGroups.map((group) => {
            const isCollapsed = !!collapsed[group.id]
            const isEditing = editingGroupId === group.id
            return (
              <section
                key={group.id}
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="flex items-center justify-between gap-2 px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      className="shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100"
                      aria-label={isCollapsed ? "Expand group" : "Collapse group"}
                      onClick={() =>
                        setCollapsed((c) => ({ ...c, [group.id]: !c[group.id] }))
                      }
                      style={{ color: theme.textColor }}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {group.pinned && (
                      <Pin
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: theme.accentColor }}
                      />
                    )}
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => commitRename(group.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(group.id)
                          if (e.key === "Escape") setEditingGroupId(null)
                        }}
                        className="min-w-0 flex-1 rounded-lg border bg-transparent px-2 py-1 text-sm outline-none"
                        style={{
                          color: theme.textColor,
                          borderColor: theme.accentColor,
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="truncate text-left text-sm font-semibold hover:opacity-80"
                        style={{
                          color: theme.textColor,
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                        onDoubleClick={() => {
                          setEditingGroupId(group.id)
                          setEditingName(group.name)
                        }}
                        title="Double-click to rename"
                      >
                        {group.name}
                      </button>
                    )}
                    <span className="shrink-0 text-[11px] opacity-45">
                      {group.tabs.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg"
                      aria-label="Restore group"
                      title="Restore group"
                      onClick={() => handleRestoreGroup(group)}
                      style={{ color: theme.restoreColor }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg"
                      aria-label={group.pinned ? "Unpin" : "Pin"}
                      title={group.pinned ? "Unpin" : "Pin to top"}
                      onClick={() => handleTogglePin(group.id)}
                      style={{ color: theme.accentColor }}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg"
                      aria-label="Rename"
                      title="Rename"
                      onClick={() => {
                        setEditingGroupId(group.id)
                        setEditingName(group.name)
                      }}
                      style={{ color: theme.textColor }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg"
                      aria-label="Copy all URLs"
                      title="Copy all URLs"
                      onClick={() => {
                        const text = group.tabs.map((t) => t.url).join("\n")
                        navigator.clipboard?.writeText(text)
                        toast("URLs copied", "success")
                      }}
                      style={{ color: theme.textColor }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg"
                      aria-label="Delete group"
                      title="Delete group"
                      onClick={() => handleDeleteGroup(group)}
                      style={{ color: theme.deleteColor }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="space-y-0.5 px-2 pb-2 pt-1">
                    {group.tabs.map((tab, index) => (
                      <TabItem
                        key={`${group.id}-${index}`}
                        tab={{
                          id: `${group.id}-${index}`,
                          url: tab.url,
                          title: tab.title,
                          favIconUrl: tab.favIconUrl || undefined,
                          timestamp: new Date(group.updatedAt).getTime(),
                        }}
                        onRestore={handleRestoreSingle}
                        onDelete={() => handleDeleteTab(group.id, index)}
                        onCopy={handleCopyUrl}
                        restoreColor={theme.restoreColor}
                        deleteColor={theme.deleteColor}
                        textColor={theme.textColor}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}

          {searchQuery && filteredGroups.length === 0 && (
            <EmptyState
              message={`No matches for “${searchQuery}”`}
              description="Try a domain, title fragment, or clear the search"
              textColor={theme.textColor}
              backgroundColor={theme.backgroundColor}
            />
          )}
        </main>

        <div className="mt-12">
          <Footer
            onFeedbackClick={() => setShowFeedback(true)}
            textColor={theme.textColor}
            accentColor={theme.accentColor}
          />
        </div>
      </div>

      <SaveGroupDialog
        open={showSaveDialog}
        tabCount={currentTabs.length}
        defaultName={defaultGroupName}
        onClose={() => setShowSaveDialog(false)}
        onConfirm={handleSaveConfirm}
        isLoading={isLoading}
        accentColor={theme.accentColor}
        textColor={theme.textColor}
      />

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title || ""}
        description={confirmState?.description || ""}
        confirmLabel={confirmState?.confirmLabel}
        dangerous={confirmState?.dangerous}
        onClose={() => setConfirmState(null)}
        onConfirm={() => confirmState?.onConfirm()}
        textColor={theme.textColor}
        deleteColor={theme.deleteColor}
      />

      <FeedbackDialog
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        feedbackText={feedbackText}
        onFeedbackTextChange={setFeedbackText}
        onSend={() => {
          setShowFeedback(false)
          toast("Thanks for the feedback!", "success")
          setFeedbackText("")
        }}
      />

      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={theme}
        onSettingsChange={saveTheme}
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
