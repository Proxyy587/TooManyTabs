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
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm border p-0 sm:rounded-2xl"
        style={{
          background: "var(--tmt-surface)",
          borderColor: "var(--tmt-line-strong)",
          color: "var(--tmt-ink)",
        }}
      >
        <div className="space-y-5 p-6">
          <DialogHeader>
            <DialogTitle className="font-display" style={{ color: "var(--tmt-ink)" }}>
              {title}
            </DialogTitle>
            <DialogDescription style={{ color: "var(--tmt-ink-soft)" }}>
              {description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl border"
              onClick={onClose}
              style={{ borderColor: "var(--tmt-line)", color: "var(--tmt-ink)" }}
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
                background: dangerous ? "var(--tmt-danger)" : "var(--tmt-accent)",
                color: "#fffcf7",
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
