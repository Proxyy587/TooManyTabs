"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/shared/Header"
import { CurrentTabsCard } from "@/components/tabs/CurrentTabsCard"
import { SearchBar } from "@/components/tabs/SearchBar"
import { SavedTabsHeader } from "@/components/tabs/SavedTabsHeader"
import { TabItem } from "@/components/tabs/TabItem"
import { EmptyState } from "@/components/shared/EmptyState"
import { Footer } from "@/components/shared/Footer"
import { FeedbackDialog } from "@/components/shared/FeedbackDialog"
import Settings from "./Settings"

interface Tab {
  id: string
  url: string
  title: string
  favIconUrl?: string
  timestamp: number
}

interface SavedSession {
  id: string
  timestamp: number
  tabs: Tab[]
  groupLabel?: string
}

interface ThemeSettings {
  backgroundColor: string
  textColor: string
  accentColor: string
  deleteColor: string
  restoreColor: string
}

const defaultTheme: ThemeSettings = {
  backgroundColor: "#1A1A1A",
  textColor: "#F5F5F5",
  accentColor: "#60A5FA",
  deleteColor: "#F87171",
  restoreColor: "#34D399",
}

declare const chrome: typeof globalThis.chrome

export default function App() {
  const [currentTabs, setCurrentTabs] = useState<Tab[]>([])
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")

  useEffect(() => {
    loadSavedSessions()
    loadTheme()
    getCurrentTabs()
  }, [])

  // Apply theme colors as CSS variables
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--theme-background', theme.backgroundColor)
    root.style.setProperty('--theme-text', theme.textColor)
    root.style.setProperty('--theme-accent', theme.accentColor)
    root.style.setProperty('--theme-restore', theme.restoreColor)
    root.style.setProperty('--theme-delete', theme.deleteColor)
    
    // Apply background color to body
    document.body.style.backgroundColor = theme.backgroundColor
    document.body.style.color = theme.textColor
  }, [theme])

  const loadTheme = async () => {
    try {
      const result = await chrome.storage.local.get(["themeSettings"])
      if (result.themeSettings) {
        setTheme(result.themeSettings)
      }
    } catch (error) {
      console.error("Error loading theme:", error)
    }
  }

  const saveTheme = async (newTheme: ThemeSettings) => {
    try {
      await chrome.storage.local.set({ themeSettings: newTheme })
      setTheme(newTheme)
    } catch (error) {
      console.error("Error saving theme:", error)
    }
  }

  const loadSavedSessions = async () => {
    try {
      const result = await chrome.storage.local.get(["savedSessions"])
      if (result.savedSessions) {
        setSavedSessions(result.savedSessions)
      }
    } catch (error) {
      console.error("Error loading sessions:", error)
    }
  }

  const saveSessions = async (sessions: SavedSession[]) => {
    try {
      await chrome.storage.local.set({ savedSessions: sessions })
      setSavedSessions(sessions)
    } catch (error) {
      console.error("Error saving sessions:", error)
    }
  }

  const getCurrentTabs = async () => {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const formattedTabs: Tab[] = tabs
        .filter((tab: any) => tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://"))
        .map((tab: any) => ({
          id: String(tab.id),
          url: tab.url || "",
          title: tab.title || "Untitled",
          favIconUrl: tab.favIconUrl,
          timestamp: Date.now(),
        }))
      setCurrentTabs(formattedTabs)
    } catch (error) {
      console.error("Error getting tabs:", error)
    }
  }

  const handleSaveCurrentTabs = async () => {
    if (currentTabs.length === 0) {
      return
    }

    setIsLoading(true)
    try {
      const newSession: SavedSession = {
        id: `session-${Date.now()}`,
        timestamp: Date.now(),
        tabs: currentTabs,
      }

      const updatedSessions = [newSession, ...savedSessions]
      await saveSessions(updatedSessions)

      const tabIds = currentTabs.map((tab) => Number.parseInt(tab.id))
      const filteredTabIds = tabIds.filter((id) => !isNaN(id))

      if (filteredTabIds.length > 0) {
        await chrome.tabs.remove(filteredTabIds)
      }

      setTimeout(() => {
        getCurrentTabs()
        setIsLoading(false)
      }, 300)
    } catch (error) {
      console.error("Error saving tabs:", error)
      setIsLoading(false)
    }
  }

  const handleRestoreAll = async () => {
    setIsLoading(true)
    try {
      for (const session of savedSessions) {
        for (const tab of session.tabs) {
          await chrome.tabs.create({ url: tab.url })
        }
      }
      setIsLoading(false)
    } catch (error) {
      console.error("Error restoring tabs:", error)
      setIsLoading(false)
    }
  }

  const handleRestoreSingle = async (url: string) => {
    try {
      await chrome.tabs.create({ url })
    } catch (error) {
      console.error("Error restoring tab:", error)
    }
  }

  const handleDeleteTab = async (sessionId: string, tabIndex: number) => {
    const updatedSessions = savedSessions.map((session) => {
      if (session.id === sessionId) {
        return {
          ...session,
          tabs: session.tabs.filter((_, idx) => idx !== tabIndex),
        }
      }
      return session
    })
    await saveSessions(updatedSessions.filter((s) => s.tabs.length > 0))
  }

  const handleDeleteAll = async () => {
    if (window.confirm("Delete all saved sessions? This cannot be undone.")) {
      await saveSessions([])
    }
  }

  const allTabs = useMemo(() => {
    const tabs: Array<{ tab: Tab; sessionId: string; index: number }> = []
    savedSessions.forEach((session) => {
      session.tabs.forEach((tab, idx) => {
        tabs.push({ tab, sessionId: session.id, index: idx })
      })
    })
    return tabs
  }, [savedSessions])

  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return allTabs
    const query = searchQuery.toLowerCase()
    return allTabs.filter(
      (item) => item.tab.title.toLowerCase().includes(query) || item.tab.url.toLowerCase().includes(query),
    )
  }, [allTabs, searchQuery])

  const handleCopyUrl = (url: string) => {
    if (navigator?.clipboard && url) {
      navigator.clipboard.writeText(url)
    }
  }

  const handleSendFeedback = () => {
    setShowFeedback(false)
    alert("Thanks for your feedback!")
    setFeedbackText("")
  }

  return (
    <div 
      className="min-h-screen w-full flex justify-center items-start"
      style={{ 
        backgroundColor: theme.backgroundColor,
        color: theme.textColor 
      }}
    >
    <div className="w-full max-w-4xl px-6 py-2">
      <div className="w-full">

          <Header 
            onSettingsClick={() => setShowSettings(true)}
            textColor={theme.textColor}
            accentColor={theme.accentColor}
          />
        </div>

        <div className="mb-6">
          <CurrentTabsCard
            tabCount={currentTabs.length}
            isLoading={isLoading}
            onSave={handleSaveCurrentTabs}
            backgroundColor={theme.backgroundColor}
            textColor={theme.textColor}
            accentColor={theme.accentColor}
          />
        </div>

        <main className="space-y-6">
          {allTabs.length > 0 && (
            <>
              <div className="mb-6">
                <SearchBar 
                  value={searchQuery} 
                  onChange={setSearchQuery}
                  backgroundColor={theme.backgroundColor}
                  textColor={theme.textColor}
                />
              </div>

              <div className="mb-6">
                <SavedTabsHeader
                  totalTabs={allTabs.length}
                  filteredCount={filteredTabs.length}
                  searchQuery={searchQuery}
                  isLoading={isLoading}
                  onRestoreAll={handleRestoreAll}
                  onDeleteAll={handleDeleteAll}
                  restoreColor={theme.restoreColor}
                  deleteColor={theme.deleteColor}
                  textColor={theme.textColor}
                />
              </div>
            </>
          )}

          {allTabs.length === 0 && (
            <EmptyState 
              textColor={theme.textColor}
              backgroundColor={theme.backgroundColor}
            />
          )}

          {filteredTabs.length > 0 && (
            <div className="space-y-1">
              {filteredTabs.map(({ tab, sessionId, index }) => {
                const tabKey = `${sessionId}-${index}`
                return (
                  <TabItem
                    key={tabKey}
                    tab={tab}
                    onRestore={handleRestoreSingle}
                    onDelete={() => handleDeleteTab(sessionId, index)}
                    onCopy={handleCopyUrl}
                    restoreColor={theme.restoreColor}
                    deleteColor={theme.deleteColor}
                    textColor={theme.textColor}
                  />
                )
              })}
            </div>
          )}

          {searchQuery && filteredTabs.length === 0 && (
            <EmptyState
              message={`No tabs match "${searchQuery}"`}
              description="Try a different search term"
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

      <FeedbackDialog
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        feedbackText={feedbackText}
        onFeedbackTextChange={setFeedbackText}
        onSend={handleSendFeedback}
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
