import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Pip, type PipMood } from "@/components/brand/Pip"
import { Scene, Sprite, type SpriteName } from "@/components/brand/Sprite"
import { LATER_SHELF_ID, PALETTE_IDS, type AppPrefs, type PaletteId, type TabGroup } from "@/lib/api"
import { LEVEL_CELLS, tabLevel } from "@/lib/level"
import { PALETTES } from "@/lib/palettes"
import { cn } from "@/lib/utils"

export type NavKey = "all" | "open" | "saved" | `shelf:${string}`

function NavItem({
  icon,
  label,
  count,
  active,
  onClick,
  small,
}: {
  icon: SpriteName
  label: string
  count: number
  active: boolean
  onClick: () => void
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press pix-s grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 text-left outline-none",
        small ? "h-8 text-[14px]" : "h-10 text-[15px]",
        active
          ? "[--pc:var(--brand)] font-semibold text-on-brand"
          : "[--pc:transparent] font-medium text-ink-2 hover:[--pc:color-mix(in_oklab,var(--ink)_9%,transparent)] hover:text-ink"
      )}
    >
      <Sprite name={icon} scale={2} />
      <span className="truncate">{label}</span>
      <span className={cn("text-[13px] tabular-nums", active ? "text-on-brand" : "text-ink-3")}>{count}</span>
    </button>
  )
}

function Swatch({ id, dark, active, onPick }: { id: PaletteId; dark: boolean; active: boolean; onPick: (id: PaletteId) => void }) {
  const sw = PALETTES[id][dark ? "dark" : "light"]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${PALETTES[id].name} theme`}
          aria-pressed={active}
          onClick={() => onPick(id)}
          className={cn(
            "press pix-s grid size-6 cursor-pointer grid-cols-2 overflow-hidden outline-none",
            active && "outline-2 outline-offset-[5px] outline-[var(--ink)]"
          )}
          style={{ "--pc": sw.raised2 } as React.CSSProperties}
        >
          <span style={{ background: sw.ground }} />
          <span style={{ background: sw.brand }} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{PALETTES[id].name}</TooltipContent>
    </Tooltip>
  )
}

export function Sidebar({
  pipMood,
  onWiggle,
  nav,
  onNav,
  counts,
  shelves,
  shelfCounts,
  windows,
  onSave,
  canSave,
  onOpenPalette,
  onOpenSettings,
  prefs,
  onPrefs,
  dark,
}: {
  pipMood: PipMood
  onWiggle: () => void
  nav: NavKey
  onNav: (k: NavKey) => void
  counts: { all: number; open: number; saved: number }
  shelves: TabGroup[]
  shelfCounts: Map<string, number>
  windows: number
  onSave: () => void
  canSave: boolean
  onOpenPalette: () => void
  onOpenSettings: () => void
  prefs: AppPrefs
  onPrefs: (patch: Partial<AppPrefs>) => void
  dark: boolean
}) {
  const level = tabLevel(counts.open)
  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col lg:flex" aria-label="Navigation">
      <div className="flex min-h-0 flex-1 flex-col gap-5 px-5 pt-7">
        {/* brand */}
        <button
          type="button"
          onClick={onWiggle}
          aria-label="toomanytabs"
          className="press pix [--pc:var(--brand-soft)] pix-card flex cursor-pointer items-center gap-3 p-3 text-left outline-none"
        >
          <Pip mood={pipMood} size={48} />
          <span className="min-w-0">
            <span className="block font-display text-[22px] leading-none font-semibold text-ink">toomanytabs</span>
            <span className="mt-1.5 block truncate text-[13px] text-ink-2">
              {counts.open === 0 ? "nothing open" : `${counts.open} open${windows > 1 ? ` · ${windows} windows` : ""}`}
            </span>
          </span>
        </button>

        <Button size="lg" onClick={onSave} disabled={!canSave} className="w-full">
          Save tabs
        </Button>

        <nav className="-mx-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1 py-1" aria-label="Views">
          <NavItem icon="navAll" label="All tabs" count={counts.all} active={nav === "all"} onClick={() => onNav("all")} />
          <NavItem icon="navOpen" label="Open now" count={counts.open} active={nav === "open"} onClick={() => onNav("open")} />
          <NavItem icon="navStack" label="Saved" count={counts.saved} active={nav === "saved"} onClick={() => onNav("saved")} />
          {shelves.length ? (
            <>
              <p className="mt-4 mb-1 px-3 font-display text-[13px] text-ink-3">shelves</p>
              {shelves.map((s) => (
                <NavItem
                  key={s.id}
                  small
                  icon={s.id === LATER_SHELF_ID ? "navMoon" : s.pinned ? "navPin" : "navStack"}
                  label={s.name}
                  count={shelfCounts.get(s.id) ?? 0}
                  active={nav === `shelf:${s.id}`}
                  onClick={() => onNav(`shelf:${s.id}`)}
                />
              ))}
            </>
          ) : null}
        </nav>

        {/* how crowded is it? */}
        <div className="pix pix-card [--pc:var(--panel)] shrink-0 p-3.5" role="group" aria-label="Tab level">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] text-ink-3">tab level</span>
            <span className="font-display text-[16px] text-ink">{level.label}</span>
          </div>
          <div className="mt-2.5 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${LEVEL_CELLS}, minmax(0, 1fr))` }} aria-hidden>
            {Array.from({ length: LEVEL_CELLS }, (_, i) => (
              <span key={i} className={cn("meter-cell h-3", i < level.cells ? "bg-brand" : "bg-raised-2")} />
            ))}
          </div>
        </div>

        {/* look and tools */}
        <div className="flex shrink-0 flex-col gap-3 pb-3">
          <div className="flex items-center justify-between px-1">
            {PALETTE_IDS.map((id) => (
              <Swatch key={id} id={id} dark={dark} active={prefs.palette === id} onPick={(p) => onPrefs({ palette: p })} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="flex-1" onClick={onOpenPalette}>
              <Sprite name="navCmd" scale={2} /> Commands
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
                  onClick={() => onPrefs({ themeMode: dark ? "light" : "dark" })}
                >
                  {dark ? <Sun /> : <Moon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{dark ? "Light mode" : "Dark mode"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Settings" onClick={onOpenSettings}>
                  <Sprite name="navGear" scale={2} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      {prefs.scenery ? <Scene className="max-h-[96px] shrink-0 [@media(max-height:760px)]:hidden" /> : null}
    </aside>
  )
}
