import { Button } from "@/components/ui/button"
import { RotateCcw, Trash2 } from "lucide-react"

interface SavedTabsHeaderProps {
  totalTabs: number
  filteredCount: number
  searchQuery: string
  isLoading: boolean
  onRestoreAll: () => void
  onDeleteAll: () => void
}

export function SavedTabsHeader({
  totalTabs,
  filteredCount,
  searchQuery,
  isLoading,
  onRestoreAll,
  onDeleteAll,
}: SavedTabsHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">
          {searchQuery ? "Search Results" : "Saved Tabs"}
        </h2>
        <p className="text-sm text-zinc-400">
          {searchQuery
            ? `${filteredCount} result${filteredCount !== 1 ? "s" : ""}`
            : `${totalTabs} tab${totalTabs !== 1 ? "s" : ""} saved`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          onClick={onRestoreAll}
          disabled={isLoading}
          variant="outline"
          className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Restore all
        </Button>
        <Button
          onClick={onDeleteAll}
          variant="destructive"
          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete all
        </Button>
      </div>
    </div>
  )
}
