import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { addToShelf, createShelf, LATER_SHELF_ID, type TabGroup } from "@/lib/api"
import { closeTabs } from "@/lib/browser"
import type { Item } from "@/lib/items"
import { Favicon } from "./Favicon"

const NEW = "__new__"

/** Save some or all open tabs to Later, an existing shelf, or a new one. */
export function SaveDialog({
  open,
  onOpenChange,
  openItems,
  shelves,
  closeAfter,
  onCloseAfterChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  openItems: Item[]
  shelves: TabGroup[]
  closeAfter: boolean
  onCloseAfterChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dest, setDest] = useState<string>(LATER_SHELF_ID)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)

  // every time it opens: all unpinned tabs selected, destination Later
  useEffect(() => {
    if (!open) return
    setSelected(new Set(openItems.filter((i) => !i.pinned).map((i) => i.key)))
    setDest(LATER_SHELF_ID)
    setName("")
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const picked = useMemo(() => openItems.filter((i) => selected.has(i.key)), [openItems, selected])
  const all = openItems.length > 0 && picked.length === openItems.length

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const save = async () => {
    if (!picked.length) return
    setBusy(true)
    try {
      const tabs = picked.map((i) => ({ url: i.url, title: i.title, favIconUrl: i.favIconUrl }))
      let label: string
      if (dest === NEW) {
        const shelf = await createShelf(name || `Saved ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, tabs)
        label = shelf.name
      } else {
        await addToShelf(dest, tabs)
        label = shelves.find((s) => s.id === dest)?.name || "Later"
      }
      if (closeAfter) await closeTabs(picked.map((i) => i.tabId!).filter((id) => id != null))
      toast(`Saved ${picked.length} ${picked.length === 1 ? "tab" : "tabs"} to ${label}${closeAfter ? " and closed them" : ""}`)
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save those tabs")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88dvh,720px)] flex-col gap-0 p-0 sm:max-w-lg sm:p-0">
        <DialogHeader className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <DialogTitle>Save tabs</DialogTitle>
          <DialogDescription>Pick the tabs to keep. Pinned tabs are left out unless you tick them.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between px-5 pb-2 sm:px-6">
          <span className="text-sm text-ink-3">
            {picked.length} of {openItems.length} selected
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setSelected(all ? new Set() : new Set(openItems.map((i) => i.key)))}
          >
            {all ? "Select none" : "Select all"}
          </Button>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-3 sm:px-4" aria-label="Open tabs">
          {openItems.map((it) => {
            const on = selected.has(it.key)
            return (
              <li key={it.key}>
                <label className="grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-raised">
                  <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggle(it.key)} />
                  <span
                    aria-hidden
                    className="grid size-5 place-items-center rounded-md bg-raised-2 text-primary-foreground transition-colors duration-150 peer-checked:bg-primary peer-focus-visible:shadow-[0_0_0_2px_var(--focus)]"
                  >
                    {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Favicon url={it.url} host={it.host} fallbackSrc={it.favIconUrl} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{it.title}</span>
                      <span className="block truncate text-xs text-ink-3">{it.host}</span>
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>

        <div className="grid gap-3 border-t px-5 pt-4 pb-1 sm:px-6">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
            <Select value={dest} onValueChange={setDest}>
              <SelectTrigger aria-label="Save to" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {shelves.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW}>New shelf…</SelectItem>
              </SelectContent>
            </Select>
            {dest === NEW ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shelf name" aria-label="New shelf name" autoFocus />
            ) : null}
          </div>
          <label className="flex items-center justify-between gap-3 text-sm text-ink">
            Close tabs after saving
            <Switch checked={closeAfter} onCheckedChange={onCloseAfterChange} />
          </label>
        </div>

        <DialogFooter className="gap-2 px-5 pt-3 pb-5 sm:gap-2 sm:px-6 sm:pb-6">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!picked.length || busy}>
            {busy ? "Saving…" : `Save ${picked.length} ${picked.length === 1 ? "tab" : "tabs"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
