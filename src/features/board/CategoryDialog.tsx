import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { classify, cleanSite, cleanWord, newCustomId, type CustomCategory } from "@/lib/categories"
import type { Item } from "@/lib/items"

const split = (v: string) => v.split(/[,\n]/).map((x) => x.trim()).filter(Boolean)

/** Make or edit your own category: a name, the sites that belong in it and any words to look for. */
export function CategoryDialog({
  open,
  onOpenChange,
  initial,
  items,
  taken,
  onSave,
  onDelete,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: CustomCategory | null
  items: Item[]
  /** names already in use, lowercased */
  taken: string[]
  onSave: (c: CustomCategory) => void
  onDelete?: (c: CustomCategory) => void
}) {
  const [name, setName] = useState("")
  const [sites, setSites] = useState("")
  const [words, setWords] = useState("")

  useEffect(() => {
    if (!open) return
    setName(initial?.label ?? "")
    setSites(initial?.sites.join(", ") ?? "")
    setWords(initial?.words.join(", ") ?? "")
  }, [open, initial])

  const draft: CustomCategory = useMemo(
    () => ({
      id: initial?.id ?? "c-draft0",
      label: name.trim(),
      sites: [...new Set(split(sites).map(cleanSite).filter(Boolean))],
      words: [...new Set(split(words).map(cleanWord).filter(Boolean))],
    }),
    [initial, name, sites, words]
  )
  const badSites = split(sites).filter((s) => !cleanSite(s))
  const matches = useMemo(
    () => (draft.sites.length || draft.words.length ? items.filter((i) => classify(i.url, i.title, {}, [draft]).category === draft.id).length : 0),
    [items, draft]
  )
  const clash = taken.includes(draft.label.toLowerCase()) && draft.label.toLowerCase() !== initial?.label.toLowerCase()
  const valid = draft.label.length > 0 && !clash && (draft.sites.length > 0 || draft.words.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) onSave({ ...draft, id: initial?.id ?? newCustomId() })
          }}
        >
          <DialogHeader>
            <DialogTitle>{initial ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>Add sites, words, or both. Tabs that match land in it.</DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Name
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa trip" maxLength={24} autoFocus />
            {clash ? <span className="text-[13px] font-normal text-danger">You already have a category with that name.</span> : null}
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Sites
            <Input value={sites} onChange={(e) => setSites(e.target.value)} placeholder="skyscanner.co.in, booking.com" />
            <span className={badSites.length ? "text-[13px] font-normal text-danger" : "text-[13px] font-normal text-ink-3"}>
              {badSites.length ? `Not a site: ${badSites.join(", ")}` : "Separate with commas. Subdomains are included."}
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            <span>
              Words <span className="font-normal text-ink-3">(optional)</span>
            </span>
            <Input value={words} onChange={(e) => setWords(e.target.value)} placeholder="goa, beach, itinerary" />
            <span className="text-[13px] font-normal text-ink-3">Matched against page titles and addresses.</span>
          </label>
          <p className="pix-s [--pc:var(--raised)] px-3 py-2 text-[13px] text-ink-2" aria-live="polite">
            {draft.sites.length || draft.words.length ? `Matches ${matches} ${matches === 1 ? "tab" : "tabs"} right now.` : "Add a site or a word to see what it matches."}
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            {initial && onDelete ? (
              <Button type="button" variant="ghost" className="text-danger hover:text-danger sm:mr-auto" onClick={() => onDelete(initial)}>
                Delete
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {initial ? "Save" : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
