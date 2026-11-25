import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { TabGroup } from "@/lib/api"

export function RenameDialog({
  shelf,
  onClose,
  onRename,
}: {
  shelf: TabGroup | null
  onClose: () => void
  onRename: (name: string) => void
}) {
  const [name, setName] = useState("")
  useEffect(() => {
    if (shelf) setName(shelf.name)
  }, [shelf])
  return (
    <Dialog open={!!shelf} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) onRename(name.trim())
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename shelf</DialogTitle>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Shelf name" autoFocus maxLength={200} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
