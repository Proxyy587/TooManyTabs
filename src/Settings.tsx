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
    const defaultSettings: ThemeSettings = {
      backgroundColor: "#0A1929",
      textColor: "#FFFFFF",
      accentColor: "#FFFFFF",
      deleteColor: "#FF4444",
      restoreColor: "#FFFFFF",
    }
    setLocalSettings(defaultSettings)
    onSettingsChange(defaultSettings)
    onClose()
  }

  const handlePreset = (preset: ThemeSettings) => {
    setLocalSettings(preset)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 p-0">
        <div className="p-8">
          <DialogHeader className="mb-8 pb-6 border-b border-zinc-800">
            <DialogTitle className="text-2xl font-semibold text-white">Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
            {/* Background Color */}
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

            {/* Text Color */}
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

            {/* Restore Button Color */}
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

            {/* Delete Button Color */}
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

            {/* Accent Color */}
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

            {/* Preset Themes */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-300">
                Preset Themes
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    handlePreset({
                      backgroundColor: "#0A1929",
                      textColor: "#FFFFFF",
                      accentColor: "#FFFFFF",
                      deleteColor: "#FF4444",
                      restoreColor: "#FFFFFF",
                    })
                  }}
                  className="px-4 py-3 rounded-lg border-2 border-zinc-700 transition-all hover:border-zinc-600 hover:bg-zinc-800 text-sm font-medium bg-zinc-800 text-white"
                >
                  Dark Blue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePreset({
                      backgroundColor: "#1A1A1A",
                      textColor: "#E0E0E0",
                      accentColor: "#4A9EFF",
                      deleteColor: "#FF6B6B",
                      restoreColor: "#51CF66",
                    })
                  }}
                  className="px-4 py-3 rounded-lg border-2 border-zinc-700 transition-all hover:border-zinc-600 hover:bg-zinc-800 text-sm font-medium bg-zinc-800 text-white"
                >
                  Dark Gray
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePreset({
                      backgroundColor: "#1E293B",
                      textColor: "#F1F5F9",
                      accentColor: "#8B5CF6",
                      deleteColor: "#EF4444",
                      restoreColor: "#10B981",
                    })
                  }}
                  className="px-4 py-3 rounded-lg border-2 border-zinc-700 transition-all hover:border-zinc-600 hover:bg-zinc-800 text-sm font-medium bg-zinc-800 text-white"
                >
                  Slate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePreset({
                      backgroundColor: "#000000",
                      textColor: "#FFFFFF",
                      accentColor: "#00FF88",
                      deleteColor: "#FF0080",
                      restoreColor: "#00D9FF",
                    })
                  }}
                  className="px-4 py-3 rounded-lg border-2 border-zinc-700 transition-all hover:border-zinc-600 hover:bg-zinc-800 text-sm font-medium bg-zinc-800 text-white"
                >
                  Pure Black
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
