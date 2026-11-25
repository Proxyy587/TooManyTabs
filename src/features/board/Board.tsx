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
import { SceneStrip, Sprite, type SpriteName } from "@/components/brand/Sprite"
import {
  addToShelf,
  deleteGroup,
  LATER_SHELF_ID,
  moveSavedTab,
  removeSavedTab,
  renameGroup,
  restoreGroup,
  togglePin,
  type AppPrefs,
  type TabGroup,
} from "@/lib/api"
import { closeTabs, focusTab, openUrls, snoozeTabs } from "@/lib/browser"
import { duplicateTabsToClose, queryTerms, type Item } from "@/lib/items"
import { Row, type RowActions } from "./Row"
import { RenameDialog } from "./RenameDialog"
import { Sidebar, type NavKey } from "./Sidebar"

export type View = "all" | "open" | "saved"

type Section = {
  id: string
  title: string
  items: Item[]
  shelf?: TabGroup
}

function matchesQuery(it: Item, terms: string[]) {
  if (!terms.length) return true
  const hay = `${it.title} ${it.url} ${it.groupName || ""}`.toLowerCase()
  return terms.every((t) => hay.includes(t))
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
  onPrefs,
  dark,
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
  prefs: AppPrefs
  onPrefs: (patch: Partial<AppPrefs>) => void
  dark: boolean
}) {
  const [query, setQuery] = useState("")
  const [shelfFilter, setShelfFilter] = useState<string>("any")
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

  const terms = queryTerms(query)
  const sections: Section[] = useMemo(() => {
    const out: Section[] = []
    if (view !== "saved" && shelfFilter === "any") {
      const visible = openItems.filter((i) => matchesQuery(i, terms))
      if (windowIds.length > 1) {
        windowIds.forEach((w, n) => {
          const inWin = visible.filter((i) => i.windowId === w)
          if (inWin.length) out.push({ id: `win-${w}`, title: `Open now · window ${n + 1}`, items: inWin })
        })
      } else if (visible.length) {
        out.push({ id: "open", title: "Open now", items: visible })
      }
    }
    if (view !== "open") {
      for (const shelf of shelves) {
        if (shelfFilter !== "any" && shelf.id !== shelfFilter) continue
        const inShelf = savedItems.filter((i) => i.groupId === shelf.id && matchesQuery(i, terms))
        if (inShelf.length || (!terms.length && shelf.id === shelfFilter)) {
          out.push({ id: shelf.id, title: shelf.name, items: inShelf, shelf })
        }
      }
    }
    return out
    // terms is derived from query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, shelfFilter, openItems, savedItems, shelves, windowIds, query])

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
      copy: async (it) => {
        try {
          await navigator.clipboard.writeText(it.url)
          toast("Link copied")
        } catch {
          toast("Couldn't copy the link")
        }
      },
    }),
    [shelves, cheer]
  )

  const closeTwins = async () => {
    const n = twins.length
    await closeTabs(twins)
    cheer()
    toast(`Closed ${n} duplicate ${n === 1 ? "tab" : "tabs"}`)
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
  const shelfCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of savedItems) if (i.groupId != null) m.set(i.groupId, (m.get(i.groupId) ?? 0) + 1)
    return m
  }, [savedItems])

  const nav: NavKey = shelfFilter !== "any" ? `shelf:${shelfFilter}` : view
  const onNav = (k: NavKey) => {
    if (k.startsWith("shelf:")) {
      setView("saved")
      setShelfFilter(k.slice(6))
    } else {
      setView(k as View)
      setShelfFilter("any")
    }
  }
  const activeShelf = shelves.find((s) => s.id === shelfFilter)
  const hero = activeShelf
    ? { title: activeShelf.name, sub: `${shelfCounts.get(activeShelf.id) ?? 0} saved ${(shelfCounts.get(activeShelf.id) ?? 0) === 1 ? "tab" : "tabs"}` }
    : view === "open"
      ? { title: "open now", sub: openItems.length ? `${openItems.length} ${openItems.length === 1 ? "tab" : "tabs"}${windowIds.length > 1 ? ` in ${windowIds.length} windows` : ""}` : "nothing open" }
      : view === "saved"
        ? { title: "saved", sub: `${savedItems.length} ${savedItems.length === 1 ? "tab" : "tabs"} on ${shelves.length} ${shelves.length === 1 ? "shelf" : "shelves"}` }
        : { title: "your tabs", sub: summary.long }
  const compact = prefs.density === "compact"

  return (
    <div className="lg:flex">
      <Sidebar
        pipMood={pipMood}
        onWiggle={cheer}
        nav={nav}
        onNav={onNav}
        counts={counts}
        shelves={shelves}
        shelfCounts={shelfCounts}
        windows={windowIds.length}
        onSave={onOpenSave}
        canSave={openItems.length > 0}
        onOpenPalette={onOpenPalette}
        onOpenSettings={onOpenSettings}
        prefs={prefs}
        onPrefs={onPrefs}
        dark={dark}
      />

      <div className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-[920px] flex-col px-4 pb-24 sm:px-6 lg:px-8">
          {/* header on small screens; the sidebar takes over from lg */}
          <header className="flex items-center gap-3 pt-5 pb-4 sm:pt-8 lg:hidden">
            <button type="button" onClick={cheer} aria-label="toomanytabs" className={`cursor-pointer outline-none ${pipMood === "happy" ? "pip-hop" : ""}`}>
              <Pip mood={pipMood} size={44} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-[22px] leading-none font-semibold tracking-tight text-ink">toomanytabs</h1>
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

          {/* search (and, on small screens, the filters) */}
          <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 bg-ground/90 px-4 pt-1 pb-4 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 lg:pt-7">
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
                className="h-11 pr-10 pl-10"
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
                <kbd className="pix-s [--pc:var(--raised-2)] pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 px-1.5 font-display text-xs text-ink-2 sm:block">/</kbd>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:hidden">
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
                  <SelectTrigger aria-label="Shelf" className="w-full sm:w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" align="end">
                    <SelectItem value="any">All shelves</SelectItem>
                    {shelves.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>

          {/* what you're looking at */}
          <div className="mt-2 mb-5 hidden items-end justify-between gap-4 lg:flex">
            <div className="min-w-0">
              <h1 className="px-title truncate text-[40px] leading-none font-semibold text-ink">{hero.title}</h1>
              <p className="mt-2.5 text-[14px] text-ink-3">{hero.sub}</p>
            </div>
          </div>

          {/* one calm suggestion at a time, from Pip */}
          {view !== "saved" && !query && (twins.length > 0 || dusty.length > 0) ? (
            <div className="pix [--pc:var(--brand-soft)] mx-1 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3 text-sm text-ink">
              <Pip mood="surprised" size={32} />
              <span className="min-w-0 flex-1 font-medium">
                {twins.length > 0
                  ? `${twins.length} ${twins.length === 1 ? "tab is" : "tabs are"} open twice.`
                  : `${dusty.length} ${dusty.length === 1 ? "tab hasn't" : "tabs haven't"} been looked at in days.`}
              </span>
              <Button size="sm" variant="secondary" onClick={twins.length > 0 ? closeTwins : snoozeDusty}>
                {twins.length > 0 ? "Close extras" : "Snooze them"}
              </Button>
            </div>
          ) : null}

          {/* list */}
          <div ref={listRef} onKeyDown={onListKey} aria-live="polite" className="px-1">
            {sections.length === 0 ? (
              <Empty query={query} view={view} hasOpen={openItems.length > 0} onSave={onOpenSave} onClear={() => setQuery("")} />
            ) : (
              sections.map((section) => {
                const icon: SpriteName = section.shelf ? (section.shelf.id === LATER_SHELF_ID ? "moon" : "stack") : "window"
                return (
                  <section key={section.id} className="pix pix-card [--pc:var(--panel)] mt-7 p-2 first:mt-1 sm:p-3" aria-label={section.title}>
                    <div className="mb-1.5 flex min-h-9 items-center gap-2.5 px-2 sm:px-2.5">
                      <Sprite name={icon} scale={2} />
                      <h2 className="min-w-0 truncate font-display text-[18px] leading-none font-semibold text-ink">{section.title}</h2>
                      {section.shelf?.pinned && section.shelf.id !== LATER_SHELF_ID ? (
                        <span className="text-ink-3" aria-label="Pinned" title="Pinned">
                          <Sprite name="navPin" scale={2} />
                        </span>
                      ) : null}
                      <span className="pix-s [--pc:var(--raised-2)] px-1.5 text-[12px] leading-[18px] font-semibold text-ink-2 tabular-nums">{section.items.length}</span>
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
                          onRename={() => setRenaming(section.shelf!)}
                          onPin={() => togglePin(section.shelf!.id)}
                          onDelete={() => deleteShelf(section.shelf!)}
                        />
                      ) : null}
                    </div>
                    {section.items.length === 0 ? (
                      <p className="px-2.5 py-4 text-sm text-ink-3">Nothing here yet. Save a tab and it lands here.</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {section.items.map((it) => (
                          <Row key={it.key} item={it} shelves={shelves} now={now} actions={actions} animate={animateRows} compact={compact} />
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })
            )}
            {shownCount > 0 && query ? (
              <p className="mt-8 px-3 text-center text-[13px] text-ink-3">
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
      </div>
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
  onRename,
  onPin,
  onDelete,
}: {
  shelf: TabGroup
  onOpenWindow: () => void
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
  view,
  hasOpen,
  onSave,
  onClear,
}: {
  query: string
  view: View
  hasOpen: boolean
  onSave: () => void
  onClear: () => void
}) {
  const searching = !!query
  return (
    <div className="pix [--pc:var(--panel)] pix-card relative mt-2 flex min-h-[min(540px,64dvh)] flex-col items-center justify-center gap-3 overflow-hidden px-6 pt-12 pb-32 text-center">
      <SceneStrip className="absolute inset-x-0 bottom-0" />
      <Sprite name="cloud" scale={4} className="absolute top-8 left-[10%] max-sm:hidden" />
      <Sprite name="star" scale={3} className="absolute top-12 right-[14%] max-sm:hidden" />
      <Sprite name="spark" scale={3} className="absolute top-24 right-[26%] max-sm:hidden" />
      <Sprite name="heart" scale={3} className="absolute top-20 left-[24%] max-sm:hidden" />
      <Pip mood={searching ? "surprised" : "sleepy"} size={96} />
      <p className="px-title text-2xl text-ink">
        {searching ? `nothing matches “${query}”` : view === "open" ? "no tabs open" : "nothing saved yet"}
      </p>
      <p className="max-w-xs text-sm text-ink-2">
        {searching
          ? "Try fewer words, or search by site name."
          : view === "open"
            ? "Open some pages and they'll show up here."
            : "Save the tabs you want to come back to. They stay on this device, even after you close them."}
      </p>
      {searching ? (
        <Button variant="secondary" onClick={onClear}>
          Clear search
        </Button>
      ) : view !== "open" && hasOpen ? (
        <Button onClick={onSave}>Save tabs</Button>
      ) : null}
    </div>
  )
}
