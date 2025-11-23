import { Layers } from "lucide-react"

interface EmptyStateProps {
  message?: string
  description?: string
  textColor?: string
  backgroundColor?: string
}

export function EmptyState({
  message = "No saved tabs yet",
  description = "Save your current tabs to get started",
  textColor,
  backgroundColor,
}: EmptyStateProps) {
  return (
    <div className="text-center py-20 flex flex-col items-center justify-center">
      <div 
        className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center border"
        style={{
          backgroundColor: backgroundColor || 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}
      >
        <Layers 
          className="w-10 h-10 opacity-40" 
          style={{ color: textColor || 'var(--theme-text)' }}
        />
      </div>
      <p 
        className="text-xl font-semibold mb-2"
        style={{ color: textColor || 'var(--theme-text)' }}
      >
        {message}
      </p>
      <p 
        className="text-sm opacity-70"
        style={{ color: textColor || 'var(--theme-text)' }}
      >
        {description}
      </p>
    </div>
  )
}
