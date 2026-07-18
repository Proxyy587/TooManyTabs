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
        className="max-w-sm border p-0 sm:rounded-3xl"
        style={{
          background: "var(--paper-2)",
          borderColor: "var(--line-2)",
          color: "var(--ink)",
        }}
      >
        <div className="space-y-5 p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl" style={{ color: "var(--ink)", fontWeight: 700 }}>
              {title}
            </DialogTitle>
            <DialogDescription style={{ color: "var(--ink-3)" }}>{description}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full border"
              onClick={onClose}
              style={{ borderColor: "var(--line-2)", color: "var(--ink)" }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-full"
              onClick={() => {
                onConfirm()
                onClose()
              }}
              style={{
                background: dangerous ? "var(--danger)" : "var(--ink)",
                color: "#fff",
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
