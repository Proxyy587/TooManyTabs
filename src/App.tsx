"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Settings as SettingsIcon, Search, Trash2, RotateCcw, Copy, Save, Layers } from "lucide-react"
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
  backgroundColor: "#0A1929",
  textColor: "#FFFFFF",
  accentColor: "#FFFFFF",
  deleteColor: "#FF4444",
  restoreColor: "#FFFFFF",
}

declare const chrome: typeof globalThis.chrome

// Mock Settings component

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
  }, [])

  useEffect(() => {
    getCurrentTabs()
  }, [])

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white ">
      <div className="w-full mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  TooManyTabs
                </h1>
                <p className="text-slate-400 text-sm">Organize your browsing chaos</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowSettings(true)}
              className="rounded-xl hover:bg-slate-800/50 transition-all"
            >
              <SettingsIcon className="w-5 h-5 text-slate-400" />
            </Button>
          </div>
        </header>

        <main className="space-y-6">
          {/* Current Tabs Card */}
          {currentTabs.length > 0 && (
            <Card className="border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-900/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
              <CardHeader className="relative pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Layers className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-white">
                      {currentTabs.length} tab{currentTabs.length !== 1 ? "s" : ""} open
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Save them to free up memory and declutter
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="relative pt-0">
                <Button 
                  onClick={handleSaveCurrentTabs} 
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20 transition-all"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "Saving..." : "Save All Tabs"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Search Bar */}
          {allTabs.length > 0 && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search tabs by title or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-slate-900/50 border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>
          )}

          {/* Action Bar */}
          {filteredTabs.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {searchQuery ? `Search Results` : "Saved Tabs"}
                </h2>
                <p className="text-sm text-slate-400">
                  {searchQuery
                    ? `${filteredTabs.length} result${filteredTabs.length !== 1 ? "s" : ""}`
                    : `${allTabs.length} tab${allTabs.length !== 1 ? "s" : ""} saved`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleRestoreAll} 
                  disabled={isLoading} 
                  variant="outline"
                  className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore all
                </Button>
                <Button 
                  onClick={handleDeleteAll} 
                  variant="destructive"
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete all
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {allTabs.length === 0 && (
            <div className="text-center py-24 h-screen flex flex-col items-center justify-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-800/50 rounded-3xl flex items-center justify-center">
                <Layers className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-2xl font-semibold text-white mb-2">No saved tabs yet</p>
              <p className="text-slate-400">Save your current tabs to get started</p>
            </div>
          )}

          {/* Tab List */}
          {filteredTabs.length > 0 && (
            <div className="space-y-3">
              {filteredTabs.map(({ tab, sessionId, index }) => {
                const tabKey = `${sessionId}-${index}`
                return (
                  <Card 
                    key={tabKey}
                    className="border-slate-800 bg-slate-900/50 backdrop-blur-xl hover:bg-slate-800/50 transition-all group"
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex-shrink-0">
                        {tab.favIconUrl ? (
                          <img
                            src={tab.favIconUrl}
                            alt=""
                            className="w-6 h-6 rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              if (target) target.style.display = "none"
                            }}
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center">
                            <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-purple-400 rounded" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                          {tab.title || "Untitled"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{tab.url}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleCopyUrl(tab.url)}
                          className="rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreSingle(tab.url)}
                          className="border-slate-700 bg-slate-800/50 hover:bg-blue-500/10 hover:border-blue-500/50 text-slate-300 hover:text-blue-400 transition-all"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Restore
                        </Button>
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTab(sessionId, index)}
                          className="rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* No Results */}
          {searchQuery && filteredTabs.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-400">No tabs match "{searchQuery}"</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center mt-16 pt-8 border-t border-slate-800">
          <p className="text-slate-500 text-sm mb-2">Made with ❤️ by Proxy & <a href="https://discord.com/users/853525881032933376">Cyber</a></p>
          <Button 
            variant="link" 
            onClick={() => setShowFeedback(true)}
            className="text-slate-400 hover:text-blue-400"
          >
            Send Feedback
          </Button>
        </footer>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Send Feedback</DialogTitle>
            <DialogDescription className="text-slate-400">
              Help us improve TooManyTabs by sharing your thoughts
            </DialogDescription>
          </DialogHeader>
          <textarea
            placeholder="Your feedback here..."
            className="w-full p-3 rounded-lg border border-slate-800 bg-slate-800/50 text-white text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            rows={4}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setShowFeedback(false)}
              className="hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendFeedback} 
              disabled={!feedbackText.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={theme}
        onSettingsChange={saveTheme}
      />
    </div>
  )
}