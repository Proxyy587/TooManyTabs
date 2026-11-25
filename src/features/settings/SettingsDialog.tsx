import { useRef, useState } from "react"
import { toast } from "sonner"
import { Copy, Download, LogOut, RefreshCw, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pip } from "@/components/brand/Pip"
import {
  exportGroupsJson,
  googleLogin,
  importGroupsJson,
  logout,
  manualSync,
  type AppPrefs,
  type AuthUser,
  type ThemeMode,
} from "@/lib/api"
import { authAvailability } from "@/lib/auth"
import type { SyncInfo } from "@/hooks/useTabsData"

export type SettingsTab = "general" | "sync" | "data" | "keys" | "about"

const SHORTCUTS: [string, string][] = [
  ["⌘K / Ctrl K", "Command menu: jump to any tab or run an action"],
  ["/", "Search"],
  ["↑ ↓ or j k", "Move between tabs"],
  ["Enter", "Go to the tab, or open a saved one"],
  ["s", "Save the selected open tab to Later"],
  ["⌫ / Delete", "Close the tab, or remove it from its shelf"],
  ["Esc", "Clear search, close menus"],
  ["?", "This list"],
  ["Alt Shift K", "Open TooManyTabs from anywhere (browser shortcut)"],
  ["Alt Shift S", "Save the current tab to Later from anywhere"],
]

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-raised px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-[13px] text-ink-3">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
  tab,
  onTabChange,
  prefs,
  onPrefs,
  user,
  sync,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  tab: SettingsTab
  onTabChange: (t: SettingsTab) => void
  prefs: AppPrefs
  onPrefs: (patch: Partial<AppPrefs>) => void
  user: AuthUser | null
  sync: SyncInfo
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<null | "login" | "sync">(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const auth = authAvailability()
  const extId = typeof chrome !== "undefined" && chrome.runtime?.id ? chrome.runtime.id : "najlilhbfkkocnnhfaofffpfehcipahe"
  const redirect = `https://${extId}.chromiumapp.org/`

  const signIn = async () => {
    setBusy("login")
    setAuthError(null)
    try {
      const r = await googleLogin()
      toast(`Signed in as ${r.user.email}`)
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign-in failed.")
    } finally {
      setBusy(null)
    }
  }

  const syncNow = async () => {
    setBusy("sync")
    try {
      await manualSync()
      toast("Synced")
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sync failed")
    } finally {
      setBusy(null)
    }
  }

  const doExport = async () => {
    const blob = new Blob([await exportGroupsJson()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `toomanytabs-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast("Backup downloaded")
  }

  const doImport = async (file: File) => {
    try {
      const n = await importGroupsJson(await file.text())
      toast(`Imported ${n} ${n === 1 ? "shelf" : "shelves"}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed")
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast("Copied")
    } catch {
      toast("Couldn't copy")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col gap-0 overflow-hidden p-0 sm:p-0 max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-h-[min(640px,88dvh)] sm:min-h-[420px] sm:max-w-2xl"
      >
        <DialogHeader className="px-5 pt-5 pb-4 text-left sm:px-6 sm:pt-6">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">Preferences, sync, backups and shortcuts</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as SettingsTab)} className="min-h-0 flex-1 gap-0">
          <div className="px-5 sm:px-6">
            <TabsList aria-label="Settings sections">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="sync">Sync</TabsTrigger>
              <TabsTrigger value="data">Backup</TabsTrigger>
              <TabsTrigger value="keys">Shortcuts</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-8 sm:px-6">
            <TabsContent value="general" className="grid gap-2">
              <Field label="Appearance">
                <Tabs value={prefs.themeMode} onValueChange={(v) => onPrefs({ themeMode: v as ThemeMode })}>
                  <TabsList aria-label="Appearance" className="bg-raised-2">
                    <TabsTrigger value="system">System</TabsTrigger>
                    <TabsTrigger value="light">Light</TabsTrigger>
                    <TabsTrigger value="dark">Dark</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Field>
              <Field label="Close tabs after saving" hint="Off keeps your windows as they are.">
                <Switch checked={prefs.closeOnPark} onCheckedChange={(v) => onPrefs({ closeOnPark: v })} aria-label="Close tabs after saving" />
              </Field>
              <Field label="Suggest snoozing tabs after" hint="Snoozed tabs stay open but stop using memory.">
                <Select value={String(prefs.staleDays)} onValueChange={(v) => onPrefs({ staleDays: Number(v) })}>
                  <SelectTrigger aria-label="Suggest snoozing after" className="bg-raised-2 hover:bg-[color-mix(in_oklab,var(--raised-2)_80%,var(--ink))]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" align="end">
                    {[1, 3, 7, 14].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} {d === 1 ? "day" : "days"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </TabsContent>

            <TabsContent value="sync" className="grid gap-3">
              {user ? (
                <div className="grid gap-3 rounded-xl bg-raised px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pip font-display text-lg text-[#1c1a27]">
                      {(user.name || user.email)[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{user.name || user.email}</p>
                      <p className="truncate text-[13px] text-ink-3">
                        {sync.lastSyncError
                          ? "Last sync failed"
                          : sync.lastSyncedAt
                            ? `Synced ${new Date(sync.lastSyncedAt).toLocaleString()}`
                            : "Not synced yet"}
                      </p>
                    </div>
                  </div>
                  {sync.lastSyncError ? <p className="text-[13px] text-danger">{sync.lastSyncError}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={syncNow} disabled={busy === "sync"}>
                      <RefreshCw className={busy === "sync" ? "animate-spin motion-reduce:animate-none" : undefined} />
                      {busy === "sync" ? "Syncing…" : "Sync now"}
                    </Button>
                    <Button variant="secondary" onClick={() => logout().then(() => toast("Signed out"))}>
                      <LogOut /> Sign out
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 rounded-xl bg-raised px-4 py-4">
                  <p className="text-[15px] text-ink">Your tabs live on this device. Sign in to keep your shelves in sync between browsers.</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={signIn} disabled={busy === "login" || !auth.primary}>
                      {busy === "login" ? "Waiting for Google…" : "Sign in with Google"}
                    </Button>
                    <span className="text-[13px] text-ink-3">
                      {auth.primary === "getAuthToken"
                        ? "Uses your browser's Google account."
                        : auth.primary === "webAuthFlow"
                          ? "Opens a Google sign-in window."
                          : "Sign-in isn't set up in this build."}
                    </span>
                  </div>
                  {authError ? (
                    <p role="alert" className="rounded-lg bg-sunk px-3 py-2 text-[13px] text-danger">
                      {authError}
                    </p>
                  ) : null}
                </div>
              )}
              <details className="group rounded-xl bg-raised px-4 py-3 text-[13px] text-ink-2">
                <summary className="cursor-pointer font-medium text-ink select-none">Setup details for developers</summary>
                <div className="mt-3 grid gap-2">
                  <SetupLine label="Extension ID" value={extId} onCopy={copy} />
                  <SetupLine label="Web client redirect URI" value={redirect} onCopy={copy} />
                  <p>
                    Chrome client: {auth.extensionClient ? "set" : "missing"} · Web client: {auth.webClient ? "set" : "missing"} · This browser:{" "}
                    {auth.chrome ? "Google Chrome" : "not Google Chrome, so the web flow is used"}
                  </p>
                  <p>Full steps are in AUTH.md.</p>
                </div>
              </details>
            </TabsContent>

            <TabsContent value="data" className="grid gap-2">
              <Field label="Download a backup" hint="Every shelf and tab, as a JSON file.">
                <Button variant="secondary" onClick={doExport}>
                  <Download /> Download
                </Button>
              </Field>
              <Field label="Restore from a backup" hint="Adds to what you have. Nothing is deleted.">
                <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                  <Upload /> Choose file
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) doImport(f)
                    e.target.value = ""
                  }}
                />
              </Field>
            </TabsContent>

            <TabsContent value="keys">
              <dl className="grid gap-1">
                {SHORTCUTS.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[minmax(7.5rem,auto)_1fr] items-baseline gap-3 rounded-lg px-2 py-2 odd:bg-raised">
                    <dt>
                      <kbd className="rounded-md bg-sunk px-1.5 py-0.5 font-sans text-[13px] font-semibold text-ink">{k}</kbd>
                    </dt>
                    <dd className="text-[14px] text-ink-2">{v}</dd>
                  </div>
                ))}
              </dl>
            </TabsContent>

            <TabsContent value="about" className="grid gap-4">
              <div className="flex items-center gap-4 rounded-xl bg-raised px-4 py-4">
                <Pip mood="happy" size={56} />
                <div>
                  <p className="font-display text-xl text-ink">toomanytabs</p>
                  <p className="text-[13px] text-ink-3">
                    Version {typeof chrome !== "undefined" && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : "dev"} · by Abhijit
                  </p>
                </div>
              </div>
              <p className="text-[14px] text-ink-2">
                Every tab you have open or saved, on one calm page. Your tabs stay on this device unless you sign in to sync.
                Pip is the little tab that keeps the others.
              </p>
              <p className="text-[13px] text-ink-3">
                Fonts: Pixelify Sans and Atkinson Hyperlegible Next, both under the SIL Open Font License. Interface built on Radix and
                shadcn/ui (MIT). See THIRD_PARTY.md.
              </p>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function SetupLine({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded-md bg-sunk px-2 py-1 font-mono text-[12px] text-ink">{value}</code>
      <Button variant="ghost" size="icon-xs" aria-label={`Copy ${label}`} onClick={() => onCopy(value)}>
        <Copy />
      </Button>
    </div>
  )
}
