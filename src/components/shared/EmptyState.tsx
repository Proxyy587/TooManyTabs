import { Layers, Save } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  message?: string
  description?: string
  textColor?: string
  backgroundColor?: string
  accentColor?: string
  onSaveClick?: () => void
  canSave?: boolean
  tabCount?: number
}

export function EmptyState({
  message = "Your shelf is empty",
  description = "Save open tabs into named groups. Everything stays on this device until you choose to sync.",
  textColor,
  backgroundColor,
  accentColor = "#60A5FA",
  onSaveClick,
  canSave,
  tabCount = 0,
}: EmptyStateProps) {
  const fg = textColor || "var(--theme-text)"

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border"
        style={{
          background:
            backgroundColor ||
            "radial-gradient(circle at 30% 30%, rgba(96,165,250,0.18), rgba(255,255,255,0.03))",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <Layers className="h-9 w-9 opacity-50" style={{ color: fg }} />
      </div>
      <p className="mb-2 text-xl font-semibold" style={{ color: fg, fontFamily: "'Space Grotesk', sans-serif" }}>
        {message}
      </p>
      <p className="mb-6 max-w-sm text-sm leading-relaxed opacity-65" style={{ color: fg }}>
        {description}
      </p>
      {canSave && onSaveClick && (
        <Button
          onClick={onSaveClick}
          className="rounded-xl px-5"
          style={{ background: accentColor, color: "#0a0a0a" }}
        >
          <Save className="mr-2 h-4 w-4" />
          Save {tabCount} open tab{tabCount !== 1 ? "s" : ""}
        </Button>
      )}
      <div className="mt-8 grid w-full max-w-md gap-2 text-left text-xs opacity-55" style={{ color: fg }}>
        <p>· Right-click any page → Save All Tabs</p>
        <p>· Search saved tabs anytime with ⌘K / Ctrl+K</p>
        <p>· Sign in later to sync across devices</p>
      </div>
    </div>
  )
}
