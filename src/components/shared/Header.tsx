import { Settings as SettingsIcon, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  onSettingsClick: () => void
}

export function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="mb-8 pb-6 border-b border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              TabVault
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Organize your browsing chaos</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className="rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          aria-label="Open settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
