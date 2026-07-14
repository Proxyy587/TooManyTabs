import { Cloud, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SyncBannerProps {
  onSignIn: () => void
  onDismiss: () => void
  isLoading?: boolean
  textColor?: string
  accentColor?: string
}

export function SyncBanner({
  onSignIn,
  onDismiss,
  isLoading,
  textColor = "#F5F5F5",
  accentColor = "#60A5FA",
}: SyncBannerProps) {
  return (
    <div
      className="relative mb-5 overflow-hidden rounded-2xl border px-4 py-3.5"
      style={{
        borderColor: "rgba(96,165,250,0.25)",
        background:
          "linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(20,20,22,0.4) 55%, rgba(52,211,153,0.08) 100%)",
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-3 top-3 opacity-50 hover:opacity-100"
        aria-label="Dismiss"
        style={{ color: textColor }}
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(96,165,250,0.2)" }}
        >
          <Cloud className="h-4 w-4" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium" style={{ color: textColor }}>
            Everything works offline — sync when you want
          </p>
          <p className="mt-1 text-xs opacity-65" style={{ color: textColor }}>
            Your groups stay on this device. Sign in to mirror them to Chrome, Edge, or Brave on another machine.
          </p>
          <Button
            size="sm"
            className="mt-3 rounded-lg"
            onClick={onSignIn}
            disabled={isLoading}
            style={{ background: accentColor, color: "#0a0a0a" }}
          >
            {isLoading ? "Opening Google…" : "Sign in to sync"}
          </Button>
        </div>
      </div>
    </div>
  )
}
