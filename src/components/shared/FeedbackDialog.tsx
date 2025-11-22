import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface FeedbackDialogProps {
  isOpen: boolean
  onClose: () => void
  feedbackText: string
  onFeedbackTextChange: (text: string) => void
  onSend: () => void
}

export function FeedbackDialog({
  isOpen,
  onClose,
  feedbackText,
  onFeedbackTextChange,
  onSend,
}: FeedbackDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-white">Send Feedback</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Help us improve TabVault by sharing your thoughts
          </DialogDescription>
        </DialogHeader>
        <textarea
          placeholder="Your feedback here..."
          className="w-full p-4 rounded-lg border border-zinc-700 bg-zinc-800 text-white text-sm placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 transition-all resize-none outline-none"
          rows={5}
          value={feedbackText}
          onChange={(e) => onFeedbackTextChange(e.target.value)}
        />
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={onSend}
            disabled={!feedbackText.trim()}
            className="bg-zinc-700 hover:bg-zinc-600 text-white disabled:opacity-50"
          >
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
