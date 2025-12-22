import { Settings as SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  onSettingsClick: () => void
}

interface HeaderProps {
  onSettingsClick: () => void
  textColor?: string
  accentColor?: string
  isAuthenticated?: boolean
  user?: { email: string; name?: string; picture?: string } | null
  onLoginClick?: () => void
  isAuthLoading?: boolean
}

export function Header({ 
  onSettingsClick, 
  textColor, 
  accentColor,
  isAuthenticated = false,
  user,
  onLoginClick,
  isAuthLoading = false,
}: HeaderProps) {
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
        <div className="flex items-center gap-2">
          {!isAuthLoading && (
            <>
              {isAuthenticated && user ? (
                <span 
                  className="text-sm opacity-70 mr-2"
                  style={{ color: textColor || 'var(--theme-text)' }}
                >
                  {user.email}
                </span>
              ) : (
                onLoginClick && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLoginClick}
                    className="rounded-lg hover:opacity-70 transition-colors mr-2"
                    style={{ 
                      color: accentColor || textColor || 'var(--theme-text)',
                      borderColor: accentColor || 'rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    Sign in with Google
                  </Button>
                )
              )}
            </>
          )}
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
      </div>
    </header>
  )
}
