import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { PipMood } from "@/components/brand/Pip"
import { Board, type View } from "@/features/board/Board"
import { CommandPalette } from "@/features/board/CommandPalette"
import { SaveDialog } from "@/features/board/SaveDialog"
import { SettingsDialog, type SettingsTab } from "@/features/settings/SettingsDialog"
import { useTabsData } from "@/hooks/useTabsData"
import { closeTabs, focusTab, openUrls } from "@/lib/browser"
import { duplicateTabsToClose, type Item } from "@/lib/items"

function useSystemDark() {
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const on = () => setDark(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return dark
}

function isTyping(el: Element | null) {
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable)
}

export default function App() {
  const data = useTabsData()
  const { items, groups, prefs, updatePrefs } = data
  const systemDark = useSystemDark()
  const dark = prefs.themeMode === "dark" || (prefs.themeMode === "system" && systemDark)

  const [view, setView] = useState<View>("all")
  const [saveOpen, setSaveOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general")
  const [pipMood, setPipMood] = useState<PipMood>("idle")
  const searchRef = useRef<HTMLInputElement>(null)
  const moodTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light"
  }, [dark])

  const openItems = useMemo(() => items.filter((i) => i.source === "open"), [items])
  const twins = useMemo(() => duplicateTabsToClose(items), [items])

  // Pip: sleepy when there's nothing at all, a short happy beat after good things.
  const restingMood: PipMood = items.length === 0 ? "sleepy" : "idle"
  useEffect(() => {
    setPipMood((m) => (m === "happy" ? m : restingMood))
  }, [restingMood])
  const cheer = useCallback(() => {
    clearTimeout(moodTimer.current)
    setPipMood("happy")
    moodTimer.current = setTimeout(() => setPipMood(restingMood), 1400)
  }, [restingMood])

  const openSettings = useCallback((tab: SettingsTab = "general") => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }, [])

  // global keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((o) => !o)
        return
      }
      if (mod || e.altKey || isTyping(document.activeElement)) return
      if (document.querySelector("[role=dialog]")) return
      if (e.key === "/") {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === "?") {
        e.preventDefault()
        openSettings("keys")
      } else if ((e.key === "j" || e.key === "ArrowDown") && !document.activeElement?.closest("[data-row]")) {
        const first = document.querySelector<HTMLElement>("[data-row]")
        if (first && document.activeElement === document.body) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openSettings])

  const activate = useCallback((it: Item) => {
    if (it.source === "open" && it.tabId != null) focusTab(it.tabId, it.windowId)
    else openUrls([it.url])
  }, [])

  const closeTwins = useCallback(async () => {
    const n = twins.length
    await closeTabs(twins)
    cheer()
    toast(`Closed ${n} duplicate ${n === 1 ? "tab" : "tabs"}`)
  }, [twins, cheer])

  if (!data.ready) {
    return <div className="min-h-dvh bg-ground" aria-busy="true" />
  }

  return (
    <TooltipProvider delayDuration={400}>
      <main className="min-h-dvh bg-ground text-ink">
        <Board
          items={items}
          shelves={groups}
          now={data.now}
          view={view}
          setView={setView}
          searchRef={searchRef}
          onOpenSave={() => setSaveOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenSettings={() => openSettings("general")}
          pipMood={pipMood}
          cheer={cheer}
        />
      </main>

      <SaveDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        openItems={openItems}
        shelves={groups}
        closeAfter={prefs.closeOnPark}
        onCloseAfterChange={(v) => updatePrefs({ closeOnPark: v })}
        onSaved={cheer}
      />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={items}
        dark={dark}
        twins={twins.length}
        onActivate={activate}
        onSaveTabs={() => setSaveOpen(true)}
        onCloseTwins={closeTwins}
        onSettings={() => openSettings("general")}
        onShortcuts={() => openSettings("keys")}
        onToggleTheme={() => updatePrefs({ themeMode: dark ? "light" : "dark" })}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        tab={settingsTab}
        onTabChange={setSettingsTab}
        prefs={prefs}
        onPrefs={updatePrefs}
        user={data.user}
        sync={data.sync}
      />
      <Toaster theme={dark ? "dark" : "light"} />
    </TooltipProvider>
  )
}
