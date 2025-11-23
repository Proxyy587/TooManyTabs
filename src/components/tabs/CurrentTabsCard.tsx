import { Card, CardHeader } from "@/components/ui/card"
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

export function CurrentTabsCard({ tabCount, isLoading, onSave, backgroundColor, textColor, accentColor }: CurrentTabsCardProps) {
  if (tabCount === 0) return null

  return (
    <Card 
      className="overflow-hidden px-5 py-4 shadow-md"
      style={{
        backgroundColor: backgroundColor || 'var(--theme-background)',
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }}
    >
      <CardHeader className="p-0">
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 
              className="text-lg font-semibold mb-1"
              style={{ color: textColor || 'var(--theme-text)' }}
            >
              {tabCount} tab{tabCount !== 1 ? "s" : ""} open
            </h2>
            <p 
              className="text-sm opacity-70"
              style={{ color: textColor || 'var(--theme-text)' }}
            >
              Save them to free up memory and declutter
            </p>
          </div>
          <Button
            onClick={onSave}
            disabled={isLoading}
            className="transition-all px-5 py-2 ml-4"
            style={{
              backgroundColor: accentColor || 'var(--theme-accent)',
              color: textColor || 'var(--theme-text)'
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Session"}
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
