import { Button } from "@/components/ui/button"
import { RotateCcw, Trash2 } from "lucide-react"
import { hexToRgba } from "@/lib/utils"

interface SavedTabsHeaderProps {
  totalTabs: number
  filteredCount: number
  searchQuery: string
  isLoading: boolean
  onRestoreAll: () => void
  onDeleteAll: () => void
  restoreColor?: string
  deleteColor?: string
  textColor?: string
}

export function SavedTabsHeader({
  totalTabs,
  filteredCount,
  searchQuery,
  isLoading,
  onRestoreAll,
  onDeleteAll,
  restoreColor,
  deleteColor,
  textColor,
}: SavedTabsHeaderProps) {
  return (
    <div 
      className="flex items-center justify-between rounded-lg"
      style={{ backgroundColor: 'var(--theme-background)' }}
    >
      <div>
        <h2 
          className="text-lg font-semibold mb-1"
          style={{ color: textColor || 'var(--theme-text)' }}
        >
          {searchQuery ? "Search Results" : "Saved Sessions"}
        </h2>
        <p 
          className="text-sm opacity-70"
          style={{ color: textColor || 'var(--theme-text)' }}
        >
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
          className="transition-all"
          style={{
            backgroundColor: restoreColor || 'var(--theme-restore)',
            color: textColor || 'var(--theme-text)',
            borderColor: restoreColor || 'var(--theme-restore)'
          }}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Restore all
        </Button>
        <Button
          onClick={onDeleteAll}
          variant="destructive"
          className="border transition-all"
          style={{
            backgroundColor: deleteColor ? hexToRgba(deleteColor, 0.2) : 'rgba(255, 68, 68, 0.2)',
            color: deleteColor || 'var(--theme-delete)',
            borderColor: deleteColor ? hexToRgba(deleteColor, 0.3) : 'rgba(255, 68, 68, 0.3)'
          }}
          onMouseEnter={(e) => {
            const deleteClr = deleteColor || '#FF4444'
            e.currentTarget.style.backgroundColor = hexToRgba(deleteClr, 0.3)
          }}
          onMouseLeave={(e) => {
            const deleteClr = deleteColor || '#FF4444'
            e.currentTarget.style.backgroundColor = hexToRgba(deleteClr, 0.2)
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete all
        </Button>
      </div>
    </div>
  )
}
