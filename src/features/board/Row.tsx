import { memo } from "react"
import { ArrowUpRight, BookmarkPlus, Copy, FolderInput, MoreHorizontal, SquareArrowOutUpRight, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { TabGroup } from "@/lib/api"
import { relativeAge, type Item } from "@/lib/items"
import { Favicon } from "./Favicon"

export type RowActions = {
  activate: (it: Item) => void
  save: (it: Item, shelfId?: string) => void
  remove: (it: Item) => void
  move: (it: Item, shelfId: string) => void
  openInNewWindow: (it: Item) => void
  copy: (it: Item) => void
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** A fact worth a chip (loud) or a quiet bit of text. */
function openFact(item: Item, now: number): { text: string; chip: boolean } | null {
  if (item.dupe) return { text: "open twice", chip: true }
  if (item.audible) return { text: "playing", chip: true }
  if (item.active) return { text: "current tab", chip: true }
  if (item.discarded) return { text: "snoozed", chip: false }
  const age = relativeAge(item.lastAccessed, now)
  return age && age !== "now" ? { text: `seen ${age} ago`, chip: false } : null
}

function Fact({ fact }: { fact: { text: string; chip: boolean } | null }) {
  if (!fact) return null
  return fact.chip ? (
    <span className="pix-s [--pc:var(--brand-soft)] shrink-0 px-1.5 text-[11px] leading-[18px] font-semibold text-ink">{fact.text}</span>
  ) : (
    <span className="shrink-0 before:mr-2 before:content-['·']">{fact.text}</span>
  )
}

/**
 * One tab. Anatomy: favicon · title (once) · domain (once) + one quiet fact.
 * Actions sit in their own grid column, so nothing can overlap the text, and
 * menus open in a portal next to the trigger.
 */
export const Row = memo(function Row({
  item,
  shelves,
  now,
  actions,
  animate,
  compact,
}: {
  item: Item
  shelves: TabGroup[]
  now: number
  actions: RowActions
  animate: boolean
  compact: boolean
}) {
  const isOpen = item.source === "open"
  const fact = isOpen ? openFact(item, now) : null
  const otherShelves = shelves.filter((s) => s.id !== item.groupId)

  return (
    <li className={animate ? "row-in" : undefined}>
      <div
        role="button"
        tabIndex={0}
        data-row={item.key}
        aria-label={`${item.title}, ${item.host || item.url}${isOpen ? ", open" : ""}`}
        onClick={() => actions.activate(item)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            actions.activate(item)
          }
        }}
        className={`group pix-s [--pc:transparent] grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-2.5 outline-none hover:[--pc:var(--raised)] has-[[data-state=open]]:[--pc:var(--raised)] focus-visible:[--pc:var(--raised)] ${compact ? "py-1" : "py-2"}`}
      >
        <Favicon url={item.url} host={item.host} fallbackSrc={item.favIconUrl} small={compact} />
        <div className="min-w-0">
          <p className="flex min-w-0 items-baseline gap-2 leading-snug">
            <span className="truncate text-[15px] font-medium text-ink" title={item.title}>
              {item.title}
            </span>
            {compact ? (
              <span className="flex min-w-0 shrink-[3] items-center gap-2 text-[13px] text-ink-3 max-sm:hidden">
                <span className="truncate">{item.host || item.url}</span>
                <Fact fact={fact} />
              </span>
            ) : null}
          </p>
          {compact ? null : (
            <p className="flex min-w-0 items-center gap-2 text-[13px] leading-snug text-ink-3">
              <span className="truncate">{item.host || item.url}</span>
              <Fact fact={fact} />
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-100 transition-opacity duration-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:has-[[data-state=open]]:opacity-100">
          {isOpen ? (
            <>
              <span className="hidden sm:inline-flex">
                <IconAction label="Save to Later (s)" onClick={() => actions.save(item)}>
                  <BookmarkPlus />
                </IconAction>
              </span>
              <IconAction label="Close tab (⌫)" onClick={() => actions.remove(item)}>
                <X />
              </IconAction>
            </>
          ) : (
            <>
              <span className="hidden sm:inline-flex">
                <IconAction label="Open" onClick={() => actions.activate(item)}>
                  <ArrowUpRight />
                </IconAction>
              </span>
              <IconAction label="Remove from shelf (⌫)" onClick={() => actions.remove(item)}>
                <Trash2 />
              </IconAction>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More actions" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
              {isOpen ? (
                <>
                  <DropdownMenuItem onSelect={() => actions.activate(item)}>
                    <ArrowUpRight /> Go to tab
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => actions.save(item)}>
                    <BookmarkPlus /> Save to Later
                  </DropdownMenuItem>
                  {shelves.length > 1 ? (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FolderInput /> Save to…
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52">
                        {shelves.map((s) => (
                          <DropdownMenuItem key={s.id} onSelect={() => actions.save(item, s.id)}>
                            <span className="truncate">{s.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ) : null}
                </>
              ) : (
                <>
                  <DropdownMenuItem onSelect={() => actions.activate(item)}>
                    <ArrowUpRight /> Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => actions.openInNewWindow(item)}>
                    <SquareArrowOutUpRight /> Open in new window
                  </DropdownMenuItem>
                  {otherShelves.length ? (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FolderInput /> Move to…
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52">
                        {otherShelves.map((s) => (
                          <DropdownMenuItem key={s.id} onSelect={() => actions.move(item, s.id)}>
                            <span className="truncate">{s.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ) : null}
                </>
              )}
              <DropdownMenuItem onSelect={() => actions.copy(item)}>
                <Copy /> Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => actions.remove(item)}>
                {isOpen ? <X /> : <Trash2 />} {isOpen ? "Close tab" : "Remove"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  )
})
