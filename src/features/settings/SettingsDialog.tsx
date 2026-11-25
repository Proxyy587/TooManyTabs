import { useRef, useState } from "react"
import { toast } from "sonner"
import { Check, Copy, Plus, X, Download, LogOut, Monitor, Moon, RefreshCw, Sun, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pip } from "@/components/brand/Pip"
import { Sprite, type SpriteName } from "@/components/brand/Sprite"
import { PALETTES } from "@/lib/palettes"
import { categoryLabel, type CustomCategory } from "@/lib/categories"
import { cn } from "@/lib/utils"
import {
  exportGroupsJson,
  googleLogin,
  importGroupsJson,
  logout,
  manualSync,
  PALETTE_IDS,
  type AppPrefs,
  type AuthUser,
  type Density,
  type PaletteId,
  type ThemeMode,
} from "@/lib/api"
import { authAvailability } from "@/lib/auth"
import type { SyncInfo } from "@/hooks/useTabsData"

export type SettingsTab = "look" | "categories" | "general" | "sync" | "data" | "keys" | "about"

const SHORTCUTS: [string, string][] = [
  ["⌘K / Ctrl K", "Command menu: jump to any tab or run an action"],
  ["/", "Search"],
  ["↑ ↓ or j k", "Move between tabs"],
  ["Enter", "Go to the tab, or open a saved one"],
  ["s", "Save the selected open tab to Later"],
  ["⌫ / Delete", "Close the tab, or remove it from its shelf"],
  ["Esc", "Clear search, close menus"],
  ["?", "This list"],
  ["⌘K → theme", "Switch light or dark from the command menu"],
  ["Alt Shift K", "Open TooManyTabs from anywhere (browser shortcut)"],
  ["Alt Shift S", "Save the current tab to Later from anywhere"],
]

const PANES: { id: SettingsTab; label: string; icon: SpriteName; title: string; blurb: string }[] = [
  { id: "look", label: "Look", icon: "navSpark", title: "look", blurb: "Pick a theme and how busy the page feels." },
  { id: "categories", label: "Categories", icon: "navStack", title: "categories", blurb: "Sort tabs your way. Your categories come first." },
  { id: "general", label: "Tabs", icon: "navOpen", title: "tabs", blurb: "How saving and snoozing behave." },
  { id: "sync", label: "Sync", icon: "navMoon", title: "sync", blurb: "Keep your shelves in step between browsers." },
  { id: "data", label: "Backup", icon: "navStack", title: "backup", blurb: "Your shelves are yours. Take a copy any time." },
  { id: "keys", label: "Shortcuts", icon: "navCmd", title: "shortcuts", blurb: "Everything you can do without the mouse." },
  { id: "about", label: "About", icon: "navHeart", title: "about", blurb: "" },
]

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="pix-s [--pc:var(--raised)] mx-0.5 flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-[13px] text-ink-2">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="font-display text-[15px] text-ink-2">{title}</h3>
      {children}
    </section>
  )
}

/** A tiny pixel window in a palette's own colours, so you see the theme before you pick it. */
function ThemeCard({ id, dark, active, onPick }: { id: PaletteId; dark: boolean; active: boolean; onPick: () => void }) {
  const sw = PALETTES[id][dark ? "dark" : "light"]
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      aria-label={`${PALETTES[id].name}, ${PALETTES[id].blurb}`}
      className={cn(
        "press pix [--px:3px] cursor-pointer p-1 text-left outline-none",
        active ? "[--pc:var(--ink)]" : "[--pc:var(--raised)] hover:[--pc:var(--raised-2)]"
      )}
    >
      <span className="pix-s block p-2" style={{ "--pc": sw.ground } as React.CSSProperties}>
        <span className="mb-1.5 flex items-center gap-1" aria-hidden>
          <span className="size-1.5" style={{ background: sw.ink }} />
          <span className="size-1.5" style={{ background: sw.brand }} />
          <span className="h-1.5 flex-1" style={{ background: sw.raised }} />
        </span>
        <span className="grid gap-1" aria-hidden>
          <span className="flex items-center gap-1.5 p-1" style={{ background: sw.raised }}>
            <span className="size-2.5" style={{ background: sw.brand }} />
            <span className="h-1.5 w-3/5" style={{ background: sw.ink }} />
          </span>
          <span className="flex items-center gap-1.5 p-1" style={{ background: sw.raised2 }}>
            <span className="size-2.5" style={{ background: sw.raised }} />
            <span className="h-1.5 w-2/5" style={{ background: sw.ink, opacity: 0.6 }} />
          </span>
        </span>
      </span>
      <span className={cn("flex items-center justify-between gap-2 px-2 pt-2 pb-1.5", active ? "text-primary-foreground" : "text-ink")}>
        <span className="min-w-0">
          <span className="block truncate text-[14px] leading-tight font-semibold">{PALETTES[id].name}</span>
          <span className={cn("block truncate text-[12px] leading-tight", active ? "text-primary-foreground/70" : "text-ink-3")}>{PALETTES[id].blurb}</span>
        </span>
        {active ? <Check className="size-4 shrink-0" strokeWidth={3} /> : null}
      </span>
    </button>
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
  dark,
  onEditCategory,
  onForgetSite,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  tab: SettingsTab
  onTabChange: (t: SettingsTab) => void
  prefs: AppPrefs
  onPrefs: (patch: Partial<AppPrefs>) => void
  user: AuthUser | null
  sync: SyncInfo
  dark: boolean
  onEditCategory: (c: CustomCategory | null) => void
  onForgetSite: (host: string) => void
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

  const pane = PANES.find((p) => p.id === tab) ?? PANES[0]
  const track = "[--pc:var(--raised-2)]"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex flex-col gap-0 overflow-hidden p-0 sm:p-0 max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 sm:h-[min(640px,88dvh)] sm:max-w-3xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Theme, tabs, sync, backups and shortcuts</DialogDescription>
        </DialogHeader>
        <Tabs
          value={tab}
          orientation="vertical"
          onValueChange={(v) => onTabChange(v as SettingsTab)}
          className="min-h-0 flex-1 gap-0 max-sm:gap-0 sm:grid sm:grid-cols-[196px_minmax(0,1fr)]"
        >
          <div className="flex min-w-0 flex-col gap-4 px-4 pt-4 pb-2 max-sm:pr-14 sm:px-5 sm:pt-6 sm:pb-6">
            <p className="hidden px-3 font-display text-[22px] leading-none text-ink sm:block">settings</p>
            <TabsList
              aria-label="Settings sections"
              className="sm:w-full sm:flex-col sm:items-stretch sm:gap-1 sm:overflow-visible sm:p-0 sm:[--pc:transparent]"
            >
              {PANES.map((p) => (
                <TabsTrigger
                  key={p.id}
                  value={p.id}
                  className="sm:h-10 sm:flex-none sm:justify-start sm:gap-3 sm:px-3 sm:text-[15px] sm:data-[state=active]:[--pc:var(--brand)] sm:data-[state=active]:text-on-brand"
                >
                  <Sprite name={p.icon} scale={2} className="max-sm:hidden" />
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="min-h-0 overflow-y-auto px-5 pt-3 pb-8 sm:px-8 sm:pt-7 sm:pr-10">
            <header className="mb-6">
              <h2 className="px-title text-[34px] leading-none font-semibold text-ink">{pane.title}</h2>
              {pane.blurb ? <p className="mt-2.5 text-[14px] text-ink-2">{pane.blurb}</p> : null}
            </header>

            <TabsContent value="look" className="grid gap-8">
              <Group title="theme">
                <div className="grid grid-cols-2 gap-3 px-0.5 sm:grid-cols-3">
                  {PALETTE_IDS.map((id) => (
                    <ThemeCard key={id} id={id} dark={dark} active={prefs.palette === id} onPick={() => onPrefs({ palette: id })} />
                  ))}
                </div>
              </Group>
              <Group title="light or dark">
                <Tabs value={prefs.themeMode} onValueChange={(v) => onPrefs({ themeMode: v as ThemeMode })} className="gap-0">
                  <TabsList aria-label="Light or dark" className={cn(track, "sm:w-fit")}>
                    <TabsTrigger value="system">
                      <Monitor /> System
                    </TabsTrigger>
                    <TabsTrigger value="light">
                      <Sun /> Light
                    </TabsTrigger>
                    <TabsTrigger value="dark">
                      <Moon /> Dark
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </Group>
              <Group title="page">
                <div className="grid gap-3">
                  <Field label="Side panel" hint="What needs attention and where your tabs go, on wide screens.">
                    <Switch checked={prefs.insights} onCheckedChange={(v) => onPrefs({ insights: v })} aria-label="Show the side panel" />
                  </Field>
                  <Field label="Row density" hint="Compact fits more tabs on screen.">
                    <Tabs value={prefs.density} onValueChange={(v) => onPrefs({ density: v as Density })} className="gap-0">
                      <TabsList aria-label="Row density" className={track}>
                        <TabsTrigger value="cozy">Cozy</TabsTrigger>
                        <TabsTrigger value="compact">Compact</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </Field>
                </div>
              </Group>
            </TabsContent>

            <TabsContent value="categories" className="grid gap-8">
              <Group title="your categories">
                <div className="grid gap-2">
                  {prefs.customCategories.length === 0 ? (
                    <p className="px-0.5 text-[14px] text-ink-2">
                      Nothing yet. Make one for a trip, a project or a client, and add the sites and words that belong in it.
                    </p>
                  ) : (
                    prefs.customCategories.map((c) => (
                      <div key={c.id} className="pix-s [--pc:var(--raised)] mx-0.5 flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium text-ink">{c.label}</p>
                          <p className="truncate text-[13px] text-ink-2">
                            {[c.sites.length ? `${c.sites.length} ${c.sites.length === 1 ? "site" : "sites"}` : "", c.words.length ? `${c.words.length} ${c.words.length === 1 ? "word" : "words"}` : ""]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => onEditCategory(c)}>
                          Edit
                        </Button>
                      </div>
                    ))
                  )}
                  <Button className="mt-1 w-fit" onClick={() => onEditCategory(null)} disabled={prefs.customCategories.length >= 12}>
                    <Plus /> New category
                  </Button>
                </div>
              </Group>
              <Group title="sites you sorted">
                {Object.keys(prefs.categoryRules).length === 0 ? (
                  <p className="px-0.5 text-[14px] text-ink-2">Open a tab's menu and pick "File … under" to always sort a site your way.</p>
                ) : (
                  <ul className="grid gap-1.5 px-0.5">
                    {Object.entries(prefs.categoryRules)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([host, cat]) => (
                        <li key={host} className="pix-s [--pc:var(--raised)] flex items-center justify-between gap-3 px-3 py-1.5 text-[14px]">
                          <span className="min-w-0 truncate">
                            <span className="text-ink">{host}</span> <span className="text-ink-3">→</span> <span className="text-ink-2">{categoryLabel(cat, prefs.customCategories)}</span>
                          </span>
                          <Button variant="ghost" size="icon-xs" aria-label={`Stop filing ${host}`} onClick={() => onForgetSite(host)}>
                            <X />
                          </Button>
                        </li>
                      ))}
                  </ul>
                )}
              </Group>
              <p className="text-[13px] text-ink-3">Sorting happens on this device. Page titles and addresses are never sent anywhere.</p>
            </TabsContent>

            <TabsContent value="general" className="grid gap-3">
              <Field label="Close tabs after saving" hint="Off keeps your windows as they are.">
                <Switch checked={prefs.closeOnPark} onCheckedChange={(v) => onPrefs({ closeOnPark: v })} aria-label="Close tabs after saving" />
              </Field>
              <Field label="Suggest snoozing tabs after" hint="Snoozed tabs stay open but stop using memory.">
                <Select value={String(prefs.staleDays)} onValueChange={(v) => onPrefs({ staleDays: Number(v) })}>
                  <SelectTrigger aria-label="Suggest snoozing after">
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

            <TabsContent value="sync" className="grid gap-4">
              {user ? (
                <div className="pix-s [--pc:var(--raised)] mx-0.5 grid gap-4 px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="pix-s [--pc:var(--brand)] grid size-10 shrink-0 place-items-center font-display text-lg text-on-brand">
                      {(user.name || user.email)[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{user.name || user.email}</p>
                      <p className="truncate text-[13px] text-ink-2">
                        {sync.lastSyncError
                          ? "Last sync failed"
                          : sync.lastSyncedAt
                            ? `Synced ${new Date(sync.lastSyncedAt).toLocaleString()}`
                            : "Not synced yet"}
                      </p>
                    </div>
                  </div>
                  {sync.lastSyncError ? <p className="text-[13px] text-danger">{sync.lastSyncError}</p> : null}
                  <div className="flex flex-wrap gap-3">
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
                <div className="pix-s [--pc:var(--raised)] mx-0.5 grid gap-4 px-4 py-5">
                  <div className="flex items-start gap-4">
                    <Pip mood="sleepy" size={56} />
                    <p className="pt-1 text-[15px] text-ink">Your tabs live on this device. Sign in to keep your shelves in sync between browsers.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="brand" onClick={signIn} disabled={busy === "login" || !auth.primary}>
                      {busy === "login" ? "Waiting for Google…" : "Sign in with Google"}
                    </Button>
                    <span className="text-[13px] text-ink-2">
                      {auth.primary === "getAuthToken"
                        ? "Uses your browser's Google account."
                        : auth.primary === "webAuthFlow"
                          ? "Opens a Google sign-in window."
                          : "Sign-in isn't set up in this build."}
                    </span>
                  </div>
                  {authError ? (
                    <p role="alert" className="pix-s [--pc:var(--sunk)] px-3 py-2 text-[13px] text-danger">
                      {authError}
                    </p>
                  ) : null}
                </div>
              )}
              <details className="group pix-s [--pc:var(--raised)] mx-0.5 px-4 py-3 text-[13px] text-ink-2">
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

            <TabsContent value="data" className="grid gap-3">
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
              <dl className="grid gap-1.5 px-0.5">
                {SHORTCUTS.map(([k, v]) => (
                  <div key={k} className="pix-s [--pc:var(--raised)] grid grid-cols-[minmax(7.5rem,auto)_1fr] items-center gap-4 px-3 py-2">
                    <dt>
                      <kbd className="pix-s [--pc:var(--raised-2)] inline-block px-1.5 py-0.5 font-display text-[13px] font-semibold text-ink">{k}</kbd>
                    </dt>
                    <dd className="text-[14px] text-ink-2">{v}</dd>
                  </div>
                ))}
              </dl>
            </TabsContent>

            <TabsContent value="about" className="grid gap-5">
              <div className="pix pix-card [--pc:var(--brand-soft)] mx-1 flex items-center gap-4 px-4 py-4">
                <Pip mood="happy" size={72} />
                <div>
                  <p className="font-display text-2xl text-ink">toomanytabs</p>
                  <p className="text-[13px] text-ink-2">
                    Version {typeof chrome !== "undefined" && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : "dev"} · by Abhijit
                  </p>
                </div>
              </div>
              <p className="text-[14px] text-ink-2">
                Tabs, sorted. Every tab you have open or saved on one page that files itself. Your tabs stay on this device unless you sign in to sync. Pip is the little tab that keeps the others.
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
      <code className="pix-s [--pc:var(--sunk)] min-w-0 flex-1 truncate px-2 py-1 font-mono text-[12px] text-ink">{value}</code>
      <Button variant="ghost" size="icon-xs" aria-label={`Copy ${label}`} onClick={() => onCopy(value)}>
        <Copy />
      </Button>
    </div>
  )
}
