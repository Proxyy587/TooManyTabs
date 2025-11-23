import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, RotateCcw, Trash2 } from "lucide-react"
import { hexToRgba } from "@/lib/utils"

interface Tab {
  id: string
  url: string
  title: string
  favIconUrl?: string
  timestamp: number
}

interface TabItemProps {
  tab: Tab
  onRestore: (url: string) => void
  onDelete: () => void
  onCopy: (url: string) => void
  restoreColor?: string
  deleteColor?: string
  textColor?: string
}

export function TabItem({ tab, onRestore, onDelete, onCopy, restoreColor, deleteColor, textColor }: TabItemProps) {
  return (
    <Card 
      className="transition-all group p-1"
      style={{
        backgroundColor: 'var(--theme-background)',
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }}
    >
      <CardContent className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {tab.favIconUrl ? (
            <img
              src={tab.favIconUrl}
              alt=""
              className="w-6 h-6 rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                if (target) target.style.display = "none"
              }}
            />
          ) : (
            <div className="w-6 h-6 rounded-lg bg-zinc-700 flex items-center justify-center border border-zinc-600">
              <div className="w-3 h-3 bg-zinc-500 rounded" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p 
            className="text-sm font-medium truncate group-hover:opacity-70 transition-colors"
            style={{ color: textColor || 'var(--theme-text)' }}
          >
            {tab.title || "Untitled"}
          </p>
          <p className="text-xs opacity-60 truncate mt-1" style={{ color: textColor || 'var(--theme-text)' }}>
            {tab.url}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopy(tab.url)}
            className="rounded-lg hover:opacity-70 transition-colors"
            style={{ color: textColor || 'var(--theme-text)' }}
            aria-label="Copy URL"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRestore(tab.url)}
            className="transition-all"
            style={{
              backgroundColor: restoreColor || 'var(--theme-restore)',
              color: textColor || 'var(--theme-text)',
              borderColor: restoreColor || 'var(--theme-restore)'
            }}
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Restore
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="rounded-lg transition-colors"
            style={{
              color: deleteColor || 'var(--theme-delete)'
            }}
            onMouseEnter={(e) => {
              const deleteClr = deleteColor || '#FF4444'
              e.currentTarget.style.backgroundColor = hexToRgba(deleteClr, 0.2)
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            aria-label="Delete tab"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
