import { Settings as SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  onSettingsClick: () => void
}

interface HeaderProps {
  onSettingsClick: () => void
  textColor?: string
  accentColor?: string
}

export function Header({ onSettingsClick, textColor, accentColor }: HeaderProps) {
  return (
    <header 
      className="mb-8 pb-2 border-b"
      style={{ 
        borderColor: 'rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <img src="/icon.svg" alt="TooManyTabs" className="w-9 h-9" />
          <div>
            <h1 
              className="text-xl font-serif font-semibold"
              style={{ color: textColor || 'var(--theme-text)' }}
            >
              TooManyTabs
            </h1>
            <p 
              className="text-xs tracking-wider font-serif font-medium mt-1 opacity-70"
              style={{ color: textColor || 'var(--theme-text)' }}
            >
              Organize your browsing chaos
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className="rounded-lg hover:opacity-70 transition-colors"
          style={{ color: accentColor || textColor || 'var(--theme-text)' }}
          aria-label="Open settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
