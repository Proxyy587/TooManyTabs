import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, RotateCcw, Trash2 } from "lucide-react"

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
}

export function TabItem({ tab, onRestore, onDelete, onCopy }: TabItemProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900 transition-all group">
      <CardContent className="flex items-center gap-4 p-4">
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
          <p className="text-sm font-medium text-white truncate group-hover:text-zinc-300 transition-colors">
            {tab.title || "Untitled"}
          </p>
          <p className="text-xs text-zinc-500 truncate mt-1">{tab.url}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopy(tab.url)}
            className="rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            aria-label="Copy URL"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRestore(tab.url)}
            className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Restore
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="rounded-lg hover:bg-red-600/20 text-zinc-400 hover:text-red-400 transition-colors"
            aria-label="Delete tab"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
