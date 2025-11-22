import { Layers } from "lucide-react"

interface EmptyStateProps {
  message?: string
  description?: string
}

export function EmptyState({
  message = "No saved tabs yet",
  description = "Save your current tabs to get started",
}: EmptyStateProps) {
  return (
    <div className="text-center py-20 flex flex-col items-center justify-center">
      <div className="w-20 h-20 mx-auto mb-6 bg-zinc-800 rounded-3xl flex items-center justify-center border border-zinc-700">
        <Layers className="w-10 h-10 text-zinc-600" />
      </div>
      <p className="text-xl font-semibold text-white mb-2">{message}</p>
      <p className="text-zinc-400 text-sm">{description}</p>
    </div>
  )
}
