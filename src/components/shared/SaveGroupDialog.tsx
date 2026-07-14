import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save } from "lucide-react"

interface SaveGroupDialogProps {
  open: boolean
  tabCount: number
  defaultName: string
  onClose: () => void
  onConfirm: (name: string, closeTabs: boolean) => void
  isLoading?: boolean
  accentColor?: string
  textColor?: string
}

export function SaveGroupDialog({
  open,
  tabCount,
  defaultName,
  onClose,
  onConfirm,
  isLoading,
  accentColor = "#60A5FA",
  textColor = "#F5F5F5",
}: SaveGroupDialogProps) {
  const [name, setName] = useState(defaultName)
  const [closeTabs, setCloseTabs] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(defaultName)
      setCloseTabs(true)
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [open, defaultName])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-md border p-0 sm:rounded-2xl"
        style={{ background: "#141416", borderColor: "rgba(255,255,255,0.12)", color: textColor }}
      >
        <div className="p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-lg" style={{ color: textColor }}>
              Save {tabCount} tab{tabCount !== 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription className="text-sm opacity-60" style={{ color: textColor }}>
              Stored on this device instantly. Syncs to cloud after you sign in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="group-name" className="text-xs font-medium uppercase tracking-wide opacity-60">
              Group name
            </label>
            <Input
              id="group-name"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) onConfirm(name.trim(), closeTabs)
              }}
              placeholder="e.g. College, Startup, Travel"
              className="h-11 rounded-xl border bg-transparent"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: textColor }}
              autoFocus
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {["College", "Work", "Reading", "Travel"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className="rounded-full border px-3 py-1 text-xs opacity-70 transition hover:opacity-100"
                  style={{ borderColor: "rgba(255,255,255,0.15)", color: textColor }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={closeTabs}
              onChange={(e) => setCloseTabs(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm opacity-80">Close tabs after saving (frees memory)</span>
          </label>

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={onClose}
              disabled={isLoading}
              style={{ borderColor: "rgba(255,255,255,0.15)", color: textColor }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              disabled={isLoading || !name.trim()}
              onClick={() => onConfirm(name.trim(), closeTabs)}
              style={{ background: accentColor, color: "#0a0a0a" }}
            >
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving…" : "Save group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
