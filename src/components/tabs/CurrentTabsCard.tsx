import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"

interface CurrentTabsCardProps {
  tabCount: number
  isLoading: boolean
  onSave: () => void
  backgroundColor?: string
  textColor?: string
  accentColor?: string
}

export function CurrentTabsCard({
  tabCount,
  isLoading,
  onSave,
  textColor,
  accentColor,
}: CurrentTabsCardProps) {
  if (tabCount === 0) return null
  const fg = textColor || "var(--theme-text)"
  const accent = accentColor || "var(--theme-accent)"

  return (
    <div
      className="overflow-hidden rounded-2xl border px-5 py-4"
      style={{
        background:
          "linear-gradient(120deg, rgba(96,165,250,0.1) 0%, rgba(255,255,255,0.03) 50%, rgba(52,211,153,0.06) 100%)",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="min-w-0">
          <h2
            className="text-lg font-semibold mb-0.5"
            style={{ color: fg, fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {tabCount} tab{tabCount !== 1 ? "s" : ""} open
          </h2>
          <p className="text-sm opacity-65" style={{ color: fg }}>
            Archive into a group — reopen anytime in one click
          </p>
        </div>
        <Button
          onClick={onSave}
          disabled={isLoading}
          className="shrink-0 rounded-xl px-5 py-2.5 transition-all"
          style={{ backgroundColor: accent, color: "#0a0a0a" }}
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving…" : "Save group"}
        </Button>
      </div>
    </div>
  )
}
