import { useRef } from "react"
import type { AppPrefs, AuthUser, ThemeAccent, ThemeMode, ViewMode } from "@/lib/api"
import { SyncChip, type SyncState } from "@/features/shelf/SyncChip"
import { CubeMark } from "@/components/brand/CubeMark"

const ACCENTS: { id: ThemeAccent; color: string }[] = [
  { id: "coral", color: "#ff4d3a" },
  { id: "mint", color: "#1f9d7a" },
  { id: "sky", color: "#2f80ed" },
  { id: "amber", color: "#e6a700" },
]

export function SettingsPage({
  prefs,
  user,
  syncState,
  syncHint,
  onBack,
  onPrefs,
  onLogin,
  onLogout,
  onSync,
  onExport,
  onImport,
  authLoading,
  syncing,
}: {
  prefs: AppPrefs
  user: AuthUser | null
  syncState: SyncState
  syncHint?: string
  onBack: () => void
  onPrefs: (patch: Partial<AppPrefs>) => void
  onLogin: () => void
  onLogout: () => void
  onSync: () => void
  onExport: () => void
  onImport: (file: File) => void
  authLoading?: boolean
  syncing?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost !h-8" onClick={onBack}>
          ← Shelf
        </button>
        <h2 className="font-display text-base" style={{ color: "var(--ink)" }}>
          Settings
        </h2>
      </div>

      <section className="panel space-y-3 p-3">
        <h3 className="font-display text-[11px]" style={{ color: "var(--blue)" }}>
          APPEARANCE
        </h3>
        <div className="flex gap-2">
          {(["light", "dark"] as ThemeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className="btn-ghost flex-1 capitalize"
              style={{
                borderColor: prefs.themeMode === m ? "var(--blue)" : undefined,
                color: prefs.themeMode === m ? "var(--blue)" : undefined,
              }}
              onClick={() => onPrefs({ themeMode: m })}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              className="theme-dot"
              data-active={prefs.themeAccent === a.id}
              style={{ background: a.color }}
              aria-label={a.id}
              onClick={() => onPrefs({ themeAccent: a.id })}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {(["list", "grid"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              className="btn-ghost flex-1 capitalize"
              style={{
                borderColor: prefs.viewMode === v ? "var(--blue)" : undefined,
                color: prefs.viewMode === v ? "var(--blue)" : undefined,
              }}
              onClick={() => onPrefs({ viewMode: v })}
            >
              {v}
            </button>
          ))}
        </div>
      </section>

      <section className="panel space-y-3 p-3">
        <h3 className="font-display text-[11px]" style={{ color: "var(--blue)" }}>
          BEHAVIOR
        </h3>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>Close tabs after parking</span>
          <input
            type="checkbox"
            checked={prefs.closeOnPark}
            onChange={(e) => onPrefs({ closeOnPark: e.target.checked })}
          />
        </label>
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Off by default — your shelf parks tabs without wiping the window.
        </p>
      </section>

      <section className="panel space-y-3 p-3">
        <h3 className="font-display text-[11px]" style={{ color: "var(--blue)" }}>
          ACCOUNT & SYNC
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <SyncChip state={syncState} title={syncHint} />
          {user ? (
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>
              {user.email}
            </span>
          ) : (
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>
              Guest — this device only
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {user ? (
            <>
              <button type="button" className="btn-blue" onClick={onSync} disabled={syncing}>
                {syncing ? "Syncing…" : "Sync now"}
              </button>
              <button type="button" className="btn-ghost" onClick={onLogout}>
                Sign out
              </button>
            </>
          ) : (
            <button type="button" className="btn-blue" onClick={onLogin} disabled={authLoading}>
              {authLoading ? "Signing in…" : "Sign in with Google"}
            </button>
          )}
        </div>
      </section>

      <section className="panel space-y-3 p-3">
        <h3 className="font-display text-[11px]" style={{ color: "var(--blue)" }}>
          DATA
        </h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={onExport}>
            Export JSON
          </button>
          <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImport(f)
              e.target.value = ""
            }}
          />
        </div>
      </section>

      <section className="panel space-y-2 p-3">
        <h3 className="font-display text-[11px]" style={{ color: "var(--blue)" }}>
          ABOUT
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <CubeMark idle />
          <span className="font-display">TooManyTabs</span>
          <span style={{ color: "var(--ink-3)" }}>0.3</span>
        </div>
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Your go-to tab shelf. Local-first; sync optional.
          <br />
          by Abhijit
        </p>
      </section>
    </div>
  )
}
