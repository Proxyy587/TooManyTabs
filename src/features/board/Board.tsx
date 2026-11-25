import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ArrowUpRight, Command as CommandIcon, MoreHorizontal, Search, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Pip, type PipMood } from "@/components/brand/Pip"
import {
  addToShelf,
  deleteGroup,
  LATER_SHELF_ID,
  moveSavedTab,
  removeSavedTab,
  renameGroup,
  restoreGroup,
  setCategoryRule,
  togglePin,
  type AppPrefs,
  type TabGroup,
} from "@/lib/api"
import { closeTabs, focusTab, openUrls, snoozeTabs } from "@/lib/browser"
import { CATEGORIES } from "@/lib/categories"
import {
  applyFilters,
  duplicateTabsToClose,
  facetCounts,
  keptTabsToClose,
  shelfToMarkdown,
  smartCategories,
  type Filters,
  type Flag,
  type Item,
} from "@/lib/items"
import { Insights } from "./Insights"
import { SmartFilters } from "./SmartFilters"
import { Row, type RowActions } from "./Row"
import { RenameDialog } from "./RenameDialog"

export type View = "all" | "open" | "saved"

type Section = {
  id: string
  title: string
  items: Item[]
  shelf?: TabGroup
}

export function Board({
  items,
  shelves,
  now,
  onOpenSave,
  onOpenPalette,
  onOpenSettings,
  searchRef,
  view,
  setView,
  pipMood,
  cheer,
  prefs,
  onNewCategory,
}: {
  items: Item[]
  shelves: TabGroup[]
  now: number
  onOpenSave: () => void
  onOpenPalette: () => void
  onOpenSettings: () => void
  searchRef: React.RefObject<HTMLInputElement | null>
  view: View
  setView: (v: View) => void
  pipMood: PipMood
  cheer: () => void
  prefs: Pick<AppPrefs, "density" | "insights" | "staleDays" | "customCategories" | "categoryRules">
  onNewCategory: () => void
}) {
  const [query, setQuery] = useState("")
  const [shelfFilter, setShelfFilter] = useState<string>("any")
  const [cats, setCats] = useState<string[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [renaming, setRenaming] = useState<TabGroup | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // rows animate in only on first paint, not on every filter keystroke
  const [animateRows, setAnimateRows] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setAnimateRows(false), 400)
    return () => clearTimeout(t)
  }, [])

  // forget a shelf filter whose shelf was deleted
  useEffect(() => {
    if (shelfFilter !== "any" && !shelves.some((s) => s.id === shelfFilter)) setShelfFilter("any")
  }, [shelves, shelfFilter])

  const openItems = useMemo(() => items.filter((i) => i.source === "open"), [items])
  const savedItems = useMemo(() => items.filter((i) => i.source === "saved"), [items])
  const twins = useMemo(() => duplicateTabsToClose(items), [items])
  const dusty = useMemo(() => openItems.filter((i) => i.stale && !i.discarded), [openItems])
  const windowIds = useMemo(() => [...new Set(openItems.map((i) => i.windowId))], [openItems])

  const custom = prefs.customCategories
  const filters: Filters = useMemo(
    () => ({ sources: view === "all" ? [] : [view], categories: cats, flags, shelf: shelfFilter === "any" ? null : shelfFilter, query }),
    [view, cats, flags, shelfFilter, query]
  )
  const filtered = useMemo(() => applyFilters(items, filters), [items, filters])
  const counts2 = useMemo(() => facetCounts(items, filters), [items, filters])
  const allCounts = useMemo(() => facetCounts(items, { sources: [], categories: [], flags: [], shelf: null, query: "" }), [items])
  const smart = useMemo(() => smartCategories(items, custom), [items, custom])
  // a category that disappeared (renamed away, deleted, or its sites moved) can't stay selected
  useEffect(() => {
    if (cats.some((c) => !smart.some((s) => s.id === c))) setCats((cur) => cur.filter((c) => smart.some((s) => s.id === c)))
  }, [smart, cats])
  const narrowed = cats.length > 0 || flags.length > 0
  const keptIds = useMemo(() => keptTabsToClose(items), [items])

  const sections: Section[] = useMemo(() => {
    const out: Section[] = []
    const open = filtered.filter((i) => i.source === "open")
    const saved = filtered.filter((i) => i.source === "saved")
    if (view !== "saved" && shelfFilter === "any") {
      if (windowIds.length > 1) {
        windowIds.forEach((w, n) => {
          const inWin = open.filter((i) => i.windowId === w)
          if (inWin.length) out.push({ id: `win-${w}`, title: `Open now · window ${n + 1}`, items: inWin })
        })
      } else if (open.length) {
        out.push({ id: "open", title: "Open now", items: open })
      }
    }
    if (view !== "open") {
      for (const shelf of shelves) {
        if (shelfFilter !== "any" && shelf.id !== shelfFilter) continue
        const inShelf = saved.filter((i) => i.groupId === shelf.id)
        if (inShelf.length || (!query.trim() && !narrowed && shelf.id === shelfFilter)) {
          out.push({ id: shelf.id, title: shelf.name, items: inShelf, shelf })
        }
      }
    }
    return out
  }, [filtered, view, shelfFilter, shelves, windowIds, query, narrowed])

  const shownCount = sections.reduce((n, s) => n + s.items.length, 0)

  // ------------------------------------------------------------ actions
  const actions: RowActions = useMemo(
    () => ({
      activate: (it) => {
        if (it.source === "open" && it.tabId != null) focusTab(it.tabId, it.windowId)
        else openUrls([it.url])
      },
      save: async (it, shelfId = LATER_SHELF_ID) => {
        const added = await addToShelf(shelfId, [{ url: it.url, title: it.title, favIconUrl: it.favIconUrl }])
        const name = shelves.find((s) => s.id === shelfId)?.name || "Later"
        if (added) {
          cheer()
          toast(`Saved to ${name}`)
        } else toast(`Already in ${name}`)
      },
      remove: async (it) => {
        if (it.source === "open" && it.tabId != null) {
          await closeTabs([it.tabId])
          toast("Tab closed", { action: { label: "Undo", onClick: () => openUrls([it.url], { background: true }) } })
        } else if (it.groupId != null && it.index != null) {
          const snapshot = shelves.find((s) => s.id === it.groupId)
          const ok = await removeSavedTab(it.groupId, it.index, it.url)
          if (ok && snapshot) toast("Removed", { action: { label: "Undo", onClick: () => restoreGroup(snapshot) } })
        }
      },
      move: async (it, shelfId) => {
        if (it.groupId == null || it.index == null) return
        const ok = await moveSavedTab(it.groupId, it.index, it.url, shelfId)
        if (ok) toast(`Moved to ${shelves.find((s) => s.id === shelfId)?.name}`)
      },
      openInNewWindow: (it) => openUrls([it.url], { newWindow: true }),
      file: async (it, key) => {
        if (!it.host) return
        await setCategoryRule(it.host, key)
        const label = key ? [...CATEGORIES, ...custom].find((c) => c.id === key)?.label : null
        toast(label ? `Anything from ${it.host} now goes in ${label}` : `${it.host} is sorted automatically again`)
      },
      copy: async (it) => {
        try {
          await navigator.clipboard.writeText(it.url)
          toast("Link copied")
        } catch {
          toast("Couldn't copy the link")
        }
      },
    }),
    [shelves, cheer, custom]
  )

  const closeTwins = async () => {
    const n = twins.length
    await closeTabs(twins)
    cheer()
    toast(`Closed ${n} duplicate ${n === 1 ? "tab" : "tabs"}`)
  }

  const closeKept = async () => {
    const n = keptIds.length
    await closeTabs(keptIds)
    cheer()
    toast(`Closed ${n} ${n === 1 ? "tab" : "tabs"} that ${n === 1 ? "was" : "were"} already saved`)
  }

  const copyShelf = async (name: string, list: Item[]) => {
    try {
      await navigator.clipboard.writeText(shelfToMarkdown(name, list))
      toast(`Copied ${name} as a list`)
    } catch {
      toast("Couldn't copy")
    }
  }

  const snoozeDusty = async () => {
    const n = await snoozeTabs(dusty.map((i) => i.tabId!).filter((id) => id != null))
    toast(n ? `Snoozed ${n} ${n === 1 ? "tab" : "tabs"}. They stay open but stop using memory.` : "Those tabs can't be snoozed right now")
  }

  const deleteShelf = async (shelf: TabGroup) => {
    await deleteGroup(shelf.id)
    toast(shelf.id === LATER_SHELF_ID ? "Later emptied" : `Deleted ${shelf.name}`, {
      action: { label: "Undo", onClick: () => restoreGroup(shelf) },
    })
  }

  // ------------------------------------------------------------ keyboard
  const rowEls = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-row]") || [])
  const itemByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items])

  const onListKey = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement
      const key = target.dataset?.row
      if (!key) return
      const rows = rowEls()
      const idx = rows.indexOf(target)
      const it = itemByKey.get(key)
      const go = (n: number) => {
        e.preventDefault()
        rows[Math.max(0, Math.min(rows.length - 1, n))]?.focus()
      }
      if (e.key === "ArrowDown" || e.key === "j") go(idx + 1)
      else if (e.key === "ArrowUp" || e.key === "k") go(idx - 1)
      else if (e.key === "Home") go(0)
      else if (e.key === "End") go(rows.length - 1)
      else if (it && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault()
        ;(rows[idx + 1] || rows[idx - 1])?.focus()
        actions.remove(it)
      } else if (it && e.key === "s" && it.source === "open") {
        e.preventDefault()
        actions.save(it)
      }
    },
    [itemByKey, actions]
  )

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (query) setQuery("")
      else e.currentTarget.blur()
    } else if (e.key === "ArrowDown" || e.key === "Enter") {
      const first = rowEls()[0]
      if (first) {
        e.preventDefault()
        if (e.key === "Enter") first.click()
        else first.focus()
      }
    }
  }

  // ------------------------------------------------------------ render
  const counts = { all: openItems.length + savedItems.length, open: openItems.length, saved: savedItems.length }
  const summary = summaryLine(openItems.length, windowIds.length, savedItems.length)
  const onNav = (v: View) => {
    setView(v)
    setShelfFilter("any")
  }
  const toggleCat = (id: string) => setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const toggleFlag = (f: Flag) => setFlags((c) => (c.includes(f) ? c.filter((x) => x !== f) : [...c, f]))
  const clearSmart = () => {
    setCats([])
    setFlags([])
  }
  const fileOptions = useMemo(
    () => [...custom.map((c) => ({ id: c.id, label: c.label })), ...CATEGORIES.filter((c) => c.id !== "other").map((c) => ({ id: c.id, label: c.label }))],
    [custom]
  )
  const showRail = prefs.insights
  const compact = prefs.density === "compact"

  return (
    <div className={`mx-auto w-full px-4 pb-24 sm:px-6 ${showRail ? "max-w-3xl xl:flex xl:max-w-[1080px] xl:gap-10" : "max-w-3xl"}`}>
      <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 pt-5 pb-4 sm:pt-8">
        <button type="button" onClick={cheer} aria-label="toomanytabs" className={`cursor-pointer outline-none ${pipMood === "happy" ? "pip-hop" : ""}`}>
          <Pip mood={pipMood} size={44} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[22px] leading-none font-semibold text-ink">toomanytabs</h1>
          <p className="mt-1.5 truncate text-[13px] text-ink-3">
            <span className="sm:hidden">{summary.short}</span>
            <span className="max-sm:hidden">{summary.long}</span>
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Command menu" onClick={onOpenPalette} className="max-sm:hidden">
              <CommandIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Command menu ⌘K</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Settings" onClick={onOpenSettings}>
              <Settings />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
        <Button onClick={onOpenSave} disabled={!openItems.length} className="max-[380px]:px-3">
          Save tabs
        </Button>
      </header>

      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 bg-ground/95 px-4 pt-1 pb-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Search tabs and shelves"
            aria-label="Search tabs and shelves"
            className="pr-10 pl-10"
          />
          {query ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2"
              onClick={() => {
                setQuery("")
                searchRef.current?.focus()
              }}
            >
              <X />
            </Button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 font-display text-xs text-ink-3 sm:block">/</kbd>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Tabs value={view} onValueChange={(v) => onNav(v as View)} className="min-w-0 flex-1 sm:flex-none">
            <TabsList aria-label="Show">
              <TabsTrigger value="all">
                All <Count n={counts.all} />
              </TabsTrigger>
              <TabsTrigger value="open">
                Open now <Count n={counts.open} />
              </TabsTrigger>
              <TabsTrigger value="saved">
                Saved <Count n={counts.saved} />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {view !== "open" && shelves.length > 1 ? (
            <Select value={shelfFilter} onValueChange={setShelfFilter}>
              <SelectTrigger aria-label="Shelf" className="max-sm:w-full sm:ml-auto sm:min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                <SelectItem value="any">Every shelf</SelectItem>
                {shelves.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <SmartFilters
          flagCounts={counts2.flags}
          flagTotals={allCounts.flags}
          flags={flags}
          onFlag={toggleFlag}
          categories={smart}
          categoryCounts={counts2.categories}
          selected={cats}
          onCategory={toggleCat}
          onAdd={onNewCategory}
          onClear={clearSmart}
        />
      </div>

      {view !== "saved" && !query && (twins.length > 0 || dusty.length > 0) ? (
        <div className={`pix-s [--pc:var(--brand-soft)] mx-1 mt-1 mb-2 flex ${showRail ? "xl:hidden" : ""} flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5 text-sm text-ink`}>
          <span className="min-w-0 flex-1">
            {twins.length > 0
              ? `${twins.length} ${twins.length === 1 ? "tab is" : "tabs are"} open twice.`
              : `${dusty.length} ${dusty.length === 1 ? "tab hasn't" : "tabs haven't"} been looked at in days.`}
          </span>
          <Button size="sm" variant="secondary" onClick={twins.length > 0 ? closeTwins : snoozeDusty}>
            {twins.length > 0 ? "Close extras" : "Snooze them"}
          </Button>
        </div>
      ) : null}

      <div ref={listRef} onKeyDown={onListKey} aria-live="polite" className="px-1">
        {sections.length === 0 ? (
          <Empty query={query} narrowed={narrowed} view={view} hasOpen={openItems.length > 0} onSave={onOpenSave} onClear={() => { setQuery(""); clearSmart() }} />
        ) : (
          sections.map((section) => (
            <section key={section.id} className="mt-6 first:mt-2" aria-label={section.title}>
              <div className="mb-1 flex min-h-9 items-center gap-2 px-2.5">
                <h2 className="min-w-0 truncate font-display text-[16px] leading-none font-semibold text-ink-2">{section.title}</h2>
                <span className="text-[13px] text-ink-3 tabular-nums">{section.items.length}</span>
                <span className="flex-1" />
                {section.shelf && section.items.length > 0 ? (
                  <Button variant="ghost" size="xs" onClick={() => openUrls(section.items.map((i) => i.url))}>
                    <ArrowUpRight /> Open all
                  </Button>
                ) : null}
                {section.shelf ? (
                  <ShelfMenu
                    shelf={section.shelf}
                    onOpenWindow={() => openUrls(section.items.map((i) => i.url), { newWindow: true })}
                    onCopy={() => copyShelf(section.shelf!.name, section.items)}
                    onRename={() => setRenaming(section.shelf!)}
                    onPin={() => togglePin(section.shelf!.id)}
                    onDelete={() => deleteShelf(section.shelf!)}
                  />
                ) : null}
              </div>
              {section.items.length === 0 ? (
                <p className="px-2.5 py-3 text-sm text-ink-3">Nothing here yet.</p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {section.items.map((it) => (
                    <Row key={it.key} item={it} shelves={shelves} now={now} actions={actions} animate={animateRows} compact={compact} fileOptions={fileOptions} ruled={!!prefs.categoryRules[it.host]} />
                  ))}
                </ul>
              )}
            </section>
          ))
        )}
        {shownCount > 0 && query ? (
          <p className="mt-6 px-3 text-center text-[13px] text-ink-3">
            {shownCount} {shownCount === 1 ? "match" : "matches"}
          </p>
        ) : null}
      </div>

      <RenameDialog
        shelf={renaming}
        onClose={() => setRenaming(null)}
        onRename={async (name) => {
          if (renaming) await renameGroup(renaming.id, name)
          setRenaming(null)
        }}
      />
      </div>

      {showRail ? (
        <aside className="sticky top-0 hidden max-h-dvh w-72 shrink-0 self-start overflow-y-auto pt-8 pb-8 [scrollbar-width:none] xl:block" aria-label="Insights">
          <Insights
            twins={twins.length}
            kept={allCounts.flags.kept}
            dusty={dusty.length}
            staleDays={prefs.staleDays}
            onCloseTwins={closeTwins}
            onCloseKept={closeKept}
            onSnooze={snoozeDusty}
            categories={smart}
            selected={cats}
            onCategory={toggleCat}
            tidy={pipMood === "happy"}
          />
        </aside>
      ) : null}
    </div>
  )
}

function Count({ n }: { n: number }) {
  return <span className="text-ink-3 tabular-nums">{n}</span>
}

function summaryLine(open: number, windows: number, saved: number) {
  const o = open === 0 ? "No tabs open" : `${open} open`
  const w = windows > 1 ? ` in ${windows} windows` : ""
  return { short: `${o} · ${saved} saved`, long: `${o}${w} · ${saved} saved` }
}

function ShelfMenu({
  shelf,
  onOpenWindow,
  onCopy,
  onRename,
  onPin,
  onDelete,
}: {
  shelf: TabGroup
  onOpenWindow: () => void
  onCopy: () => void
  onRename: () => void
  onPin: () => void
  onDelete: () => void
}) {
  const isLater = shelf.id === LATER_SHELF_ID
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`${shelf.name} options`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onOpenWindow} disabled={!shelf.tabs.length}>
          Open all in new window
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCopy} disabled={!shelf.tabs.length}>
          Copy as a list
        </DropdownMenuItem>
        {!isLater ? <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem> : null}
        {!isLater ? <DropdownMenuItem onSelect={onPin}>{shelf.pinned ? "Unpin" : "Pin to top"}</DropdownMenuItem> : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete} disabled={isLater && !shelf.tabs.length}>
          {isLater ? "Empty Later" : "Delete shelf"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Empty({
  query,
  narrowed,
  view,
  hasOpen,
  onSave,
  onClear,
}: {
  query: string
  narrowed: boolean
  view: View
  hasOpen: boolean
  onSave: () => void
  onClear: () => void
}) {
  const searching = !!query || narrowed
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Pip mood={searching ? "surprised" : "sleepy"} size={64} />
      <p className="font-display text-lg text-ink">
        {searching ? (query ? `Nothing matches “${query}”` : "Nothing matches those filters") : view === "open" ? "No tabs open" : "Nothing saved yet"}
      </p>
      {searching ? (
        <Button variant="secondary" size="sm" onClick={onClear}>
          {narrowed ? "Clear filters" : "Clear search"}
        </Button>
      ) : view !== "open" ? (
        <>
          <p className="max-w-xs text-sm text-ink-3">Save the tabs you want to come back to. They stay on this device.</p>
          {hasOpen ? <Button size="sm" onClick={onSave}>Save tabs</Button> : null}
        </>
      ) : null}
    </div>
  )
}
