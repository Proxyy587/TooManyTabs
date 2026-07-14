import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  dangerous?: boolean
  onClose: () => void
  onConfirm: () => void
  textColor?: string
  deleteColor?: string
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  dangerous,
  onClose,
  onConfirm,
  textColor = "#F5F5F5",
  deleteColor = "#F87171",
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm border p-0 sm:rounded-2xl"
        style={{ background: "#141416", borderColor: "rgba(255,255,255,0.12)", color: textColor }}
      >
        <div className="p-6 space-y-5">
          <DialogHeader>
            <DialogTitle style={{ color: textColor }}>{title}</DialogTitle>
            <DialogDescription className="opacity-60" style={{ color: textColor }}>
              {description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={onClose}
              style={{ borderColor: "rgba(255,255,255,0.15)", color: textColor }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={() => {
                onConfirm()
                onClose()
              }}
              style={{
                background: dangerous ? deleteColor : "#60A5FA",
                color: dangerous ? "#1a1a1a" : "#0a0a0a",
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
