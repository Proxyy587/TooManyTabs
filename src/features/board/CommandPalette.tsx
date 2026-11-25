import { ArrowUpRight, BookmarkPlus, Copy, Keyboard, Moon, Settings, Sun } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { PALETTE_IDS, type PaletteId } from "@/lib/api"
import { PALETTES } from "@/lib/palettes"
import type { Item } from "@/lib/items"
import { Favicon } from "./Favicon"

/** Every typed word must appear somewhere (no fuzzy letter-skipping, which surfaced odd matches). */
function wordFilter(value: string, search: string, keywords?: string[]) {
  const hay = `${value} ${(keywords || []).join(" ")}`.toLowerCase()
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return 1
  if (!words.every((w) => hay.includes(w))) return 0
  return hay.startsWith(words[0]) ? 1 : 0.5
}

/** ⌘K: jump to any open or saved tab, or run an action. */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  dark,
  twins,
  onActivate,
  onSaveTabs,
  onCloseTwins,
  onSettings,
  onShortcuts,
  onToggleTheme,
  palette,
  onPalette,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  items: Item[]
  dark: boolean
  twins: number
  onActivate: (it: Item) => void
  onSaveTabs: () => void
  onCloseTwins: () => void
  onSettings: () => void
  onShortcuts: () => void
  onToggleTheme: () => void
  palette: PaletteId
  onPalette: (id: PaletteId) => void
}) {
  const run = (fn: () => void) => () => {
    onOpenChange(false)
    fn()
  }
  const openTabs = items.filter((i) => i.source === "open")
  const saved = items.filter((i) => i.source === "saved")

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command menu"
      description="Jump to a tab or run an action"
      showCloseButton={false}
      filter={wordFilter}
    >
      <CommandInput placeholder="Jump to a tab, or type a command" />
      <CommandList>
        <CommandEmpty>No tabs or commands match.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={run(onSaveTabs)} disabled={!openTabs.length}>
            <BookmarkPlus /> Save open tabs…
          </CommandItem>
          {twins > 0 ? (
            <CommandItem onSelect={run(onCloseTwins)}>
              <Copy /> Close {twins} duplicate {twins === 1 ? "tab" : "tabs"}
            </CommandItem>
          ) : null}
          <CommandItem onSelect={run(onToggleTheme)}>
            {dark ? <Sun /> : <Moon />} Switch to {dark ? "light" : "dark"} mode
          </CommandItem>
          <CommandItem onSelect={run(onSettings)}>
            <Settings /> Settings
          </CommandItem>
          <CommandItem onSelect={run(onShortcuts)}>
            <Keyboard /> Keyboard shortcuts <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Theme">
          {PALETTE_IDS.filter((id) => id !== palette).map((id) => (
            <CommandItem key={id} value={`theme ${PALETTES[id].name} ${PALETTES[id].blurb}`} onSelect={run(() => onPalette(id))}>
              <span className="pix-s grid size-4 grid-cols-2 overflow-hidden" style={{ "--pc": PALETTES[id].light.raised2 } as React.CSSProperties} aria-hidden>
                <span style={{ background: PALETTES[id].light.ground }} />
                <span style={{ background: PALETTES[id].light.brand }} />
              </span>
              Theme: {PALETTES[id].name}
              <span className="ml-auto text-xs text-ink-3">{PALETTES[id].blurb}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {openTabs.length ? (
          <CommandGroup heading="Open now">
            {openTabs.map((it) => (
              <CommandItem key={it.key} value={`${it.title} ${it.url} ${it.key}`} onSelect={run(() => onActivate(it))}>
                <Favicon small url={it.url} host={it.host} fallbackSrc={it.favIconUrl} />
                <span className="min-w-0 flex-1 truncate">{it.title}</span>
                <span className="hidden shrink-0 text-xs text-ink-3 sm:inline">{it.host}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {saved.length ? (
          <CommandGroup heading="Saved">
            {saved.map((it) => (
              <CommandItem key={it.key} value={`${it.title} ${it.url} ${it.groupName} ${it.key}`} onSelect={run(() => onActivate(it))}>
                <Favicon small url={it.url} host={it.host} fallbackSrc={it.favIconUrl} />
                <span className="min-w-0 flex-1 truncate">{it.title}</span>
                <span className="hidden shrink-0 text-xs text-ink-3 sm:inline">{it.groupName}</span>
                <ArrowUpRight className="text-ink-3" />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
