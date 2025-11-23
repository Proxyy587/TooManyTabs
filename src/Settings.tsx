"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ThemeSettings {
  backgroundColor: string
  textColor: string
  accentColor: string
  deleteColor: string
  restoreColor: string
}

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  settings: ThemeSettings
  onSettingsChange: (settings: ThemeSettings) => void
}

export default function Settings({ isOpen, onClose, settings, onSettingsChange }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState<ThemeSettings>(settings)

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
    }
  }, [settings, isOpen])

  const handleSave = () => {
    onSettingsChange(localSettings)
    onClose()
  }

  const handleReset = () => {
    // Reset to Dark Mode preset
    const defaultSettings: ThemeSettings = {
      backgroundColor: "#1A1A1A",
      textColor: "#F5F5F5",
      accentColor: "#60A5FA",
      deleteColor: "#F87171",
      restoreColor: "#34D399",
    }
    setLocalSettings(defaultSettings)
    onSettingsChange(defaultSettings)
    onClose()
  }

  const handlePreset = (preset: ThemeSettings) => {
    setLocalSettings(preset)
    // Immediately apply the preset so user can see it
    onSettingsChange(preset)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 p-0">
        <div className="p-8">
          <DialogHeader className="mb-8 pb-6 border-b border-zinc-800">
            <DialogTitle className="text-2xl font-semibold text-white">Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
            {/* Color Editing - Commented out for now */}
            {/*
            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-300">
                Background Color
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={localSettings.backgroundColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, backgroundColor: e.target.value })}
                  className="w-20 h-12 rounded-lg cursor-pointer border-2 border-zinc-700 flex-shrink-0"
                />
                <input
                  type="text"
                  value={localSettings.backgroundColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, backgroundColor: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-lg font-mono text-sm bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 transition-all outline-none"
                  placeholder="#0A1929"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-300">
                Text Color
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={localSettings.textColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, textColor: e.target.value })}
                  className="w-20 h-12 rounded-lg cursor-pointer border-2 border-zinc-700 flex-shrink-0"
                />
                <input
                  type="text"
                  value={localSettings.textColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, textColor: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-lg font-mono text-sm bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 transition-all outline-none"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-300">
                Restore Button Color
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={localSettings.restoreColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, restoreColor: e.target.value })}
                  className="w-20 h-12 rounded-lg cursor-pointer border-2 border-zinc-700 flex-shrink-0"
                />
                <input
                  type="text"
                  value={localSettings.restoreColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, restoreColor: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-lg font-mono text-sm bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 transition-all outline-none"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-300">
                Delete Button Color
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={localSettings.deleteColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, deleteColor: e.target.value })}
                  className="w-20 h-12 rounded-lg cursor-pointer border-2 border-zinc-700 flex-shrink-0"
                />
                <input
                  type="text"
                  value={localSettings.deleteColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, deleteColor: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-lg font-mono text-sm bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 transition-all outline-none"
                  placeholder="#FF4444"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-300">
                Accent Color
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={localSettings.accentColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, accentColor: e.target.value })}
                  className="w-20 h-12 rounded-lg cursor-pointer border-2 border-zinc-700 flex-shrink-0"
                />
                <input
                  type="text"
                  value={localSettings.accentColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, accentColor: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-lg font-mono text-sm bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 transition-all outline-none"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
            */}

            {/* Preset Themes */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Choose a Theme
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* Light Mode */}
                <button
                  type="button"
                  onClick={() => {
                    handlePreset({
                      backgroundColor: "#FFFFFF",
                      textColor: "#1F2937",
                      accentColor: "#3B82F6",
                      deleteColor: "#EF4444",
                      restoreColor: "#10B981",
                    })
                  }}
                  className="relative px-4 py-4 rounded-lg border-2 border-zinc-700 transition-all hover:border-zinc-600 hover:scale-105 text-sm font-medium bg-gradient-to-br from-white to-gray-100 text-gray-900 shadow-md overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white opacity-50 group-hover:opacity-0 transition-opacity" />
                  <div className="relative">
                    <div className="font-semibold mb-1">Light Mode</div>
                    <div className="text-xs opacity-70">Clean & Bright</div>
                  </div>
                </button>

                {/* Dark Mode */}
                <button
                  type="button"
                  onClick={() => {
                    handlePreset({
                      backgroundColor: "#1A1A1A",
                      textColor: "#F5F5F5",
                      accentColor: "#60A5FA",
                      deleteColor: "#F87171",
                      restoreColor: "#34D399",
                    })
                  }}
                  className="relative px-4 py-4 rounded-lg border-2 border-zinc-700 transition-all hover:border-zinc-600 hover:scale-105 text-sm font-medium bg-gradient-to-br from-gray-900 to-black text-white shadow-md overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gray-800 opacity-50 group-hover:opacity-0 transition-opacity" />
                  <div className="relative">
                    <div className="font-semibold mb-1">Dark Mode</div>
                    <div className="text-xs opacity-70">Easy on the Eyes</div>
                  </div>
                </button>

                {/* Dracula */}
                <button
                  type="button"
                  onClick={() => {
                    handlePreset({
                      backgroundColor: "#282A36",
                      textColor: "#F8F8F2",
                      accentColor: "#BD93F9",
                      deleteColor: "#FF5555",
                      restoreColor: "#50FA7B",
                    })
                  }}
                  className="relative px-4 py-4 rounded-lg border-2 border-zinc-700 transition-all hover:border-zinc-600 hover:scale-105 text-sm font-medium bg-gradient-to-br from-purple-900 to-gray-900 text-purple-100 shadow-md overflow-hidden group"
                  style={{
                    backgroundColor: "#282A36",
                    background: "linear-gradient(135deg, #282A36 0%, #1E1F29 100%)",
                  }}
                >
                  <div className="absolute inset-0 bg-purple-900 opacity-30 group-hover:opacity-0 transition-opacity" />
                  <div className="relative">
                    <div className="font-semibold mb-1">Dracula</div>
                    <div className="text-xs opacity-70">Purple & Mysterious</div>
                  </div>
                </button>

                {/* Nord */}
                <button
                  type="button"
                  onClick={() => {
                    handlePreset({
                      backgroundColor: "#2E3440",
                      textColor: "#ECEFF4",
                      accentColor: "#88C0D0",
                      deleteColor: "#BF616A",
                      restoreColor: "#A3BE8C",
                    })
                  }}
                  className="relative px-4 py-4 rounded-lg border-2 border-zinc-700 transition-all hover:border-zinc-600 hover:scale-105 text-sm font-medium bg-gradient-to-br from-slate-800 to-slate-900 text-slate-100 shadow-md overflow-hidden group"
                  style={{
                    backgroundColor: "#2E3440",
                    background: "linear-gradient(135deg, #2E3440 0%, #3B4252 100%)",
                  }}
                >
                  <div className="absolute inset-0 bg-cyan-900 opacity-20 group-hover:opacity-0 transition-opacity" />
                  <div className="relative">
                    <div className="font-semibold mb-1">Nord</div>
                    <div className="text-xs opacity-70">Arctic & Cool</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900 p-6 flex items-center justify-between gap-4">
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            Reset to Default
          </Button>
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="ghost"
              className="hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-zinc-700 hover:bg-zinc-600 text-white"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
