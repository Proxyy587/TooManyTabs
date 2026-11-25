/**
 * Development-only stand-in for the chrome.* APIs the page uses, so the built
 * page can be opened with `npm run preview` (or `npm run dev`) and
 * screenshotted with realistic data. main.tsx only imports this when the page
 * is NOT running inside the extension.
 *
 *   ?mock=empty   no tabs, empty Later
 *   ?theme=dark   start in dark mode
 */
type Listener = (...args: unknown[]) => void

function event() {
  const ls = new Set<Listener>()
  return {
    addListener: (l: Listener) => ls.add(l),
    removeListener: (l: Listener) => ls.delete(l),
    hasListener: (l: Listener) => ls.has(l),
    fire: (...a: unknown[]) => ls.forEach((l) => l(...a)),
  }
}

const params = new URLSearchParams(location.search)
const empty = params.get("mock") === "empty"
const NOW = Date.now()
const H = 3600_000
const D = 24 * H

const open: Array<[string, string, number, number?]> = [
  ["Pull request #412: Fix token audience check · Proxyy587/TooManyTabs", "https://github.com/Proxyy587/TooManyTabs/pull/412", 0.05],
  ["chrome.identity | API | Chrome for Developers", "https://developer.chrome.com/docs/extensions/reference/api/identity", 0.4],
  ["Using OAuth 2.0 for Web Server Applications | Google for Developers", "https://developers.google.com/identity/protocols/oauth2/web-server", 1.2],
  ["Basic Usage | Better Auth", "https://www.better-auth.com/docs/basic-usage", 2],
  ["Linear – TMT-88 One-page shelf", "https://linear.app/toomanytabs/issue/TMT-88/one-page-shelf", 3],
  ["Inbox (12) - abhijit@example.com - Gmail", "https://mail.google.com/mail/u/0/#inbox", 0.2],
  ["Tab strip redesign – Figma", "https://www.figma.com/design/abc123/Tab-strip-redesign", 26],
  ["Lo-fi beats to sort tabs to - YouTube", "https://www.youtube.com/watch?v=jfKfPfyJRdk", 5],
  ["How to build a pixel art mascot - YouTube", "https://www.youtube.com/watch?v=pixel123", 80],
  ["Show HN: A calmer way to keep tabs | Hacker News", "https://news.ycombinator.com/item?id=42000001", 30],
  ["The case for fewer tabs — Ink & Switch", "https://www.inkandswitch.com/essay/fewer-tabs/", 100],
  ["Keyboard-first interfaces · 7 min read", "https://medium.com/@someone/keyboard-first-interfaces-8f2a", 120],
  ["Mechanical keyboard, 75% layout : Amazon.in", "https://www.amazon.in/dp/B0CXYZ1234", 140],
  ["r/chrome - Too many tabs again", "https://www.reddit.com/r/chrome/comments/abc/too_many_tabs/", 50],
  ["shadcn/ui – Dropdown Menu", "https://ui.shadcn.com/docs/components/dropdown-menu", 0.6],
  ["Radix Primitives – Dialog", "https://www.radix-ui.com/primitives/docs/components/dialog", 0.7],
  ["Pixelify Sans - Google Fonts", "https://fonts.google.com/specimen/Pixelify+Sans", 7],
  ["Claude", "https://claude.ai/new", 0.1],
  ["localhost:5173 – TooManyTabs dev", "http://localhost:5173/", 0.02],
  ["Neon Console – toomanytabs", "https://console.neon.tech/app/projects/toomanytabs", 9],
  ["chrome.identity | API | Chrome for Developers", "https://developer.chrome.com/docs/extensions/reference/api/identity#method-launchWebAuthFlow", 4],
  ["Pull request #412: Fix token audience check · Proxyy587/TooManyTabs", "https://github.com/Proxyy587/TooManyTabs/pull/412", 6],
  ["Google Cloud console – Credentials", "https://console.cloud.google.com/apis/credentials", 1.5],
  ["Spotify – Deep Focus", "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ", 0.3],
  ["Weekend trip – Google Docs", "https://docs.google.com/document/d/1trip/edit", 200],
  ["Flights to Goa | Skyscanner", "https://www.skyscanner.co.in/transport/flights/del/goi/", 210],
  ["MDN: prefers-reduced-motion", "https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion", 2.5],
  ["cmdk – Fast, composable command menu", "https://cmdk.paco.me/", 3.2],
  ["Sonner", "https://sonner.emilkowal.ski/", 3.4],
  ["Atkinson Hyperlegible Next", "https://www.brailleinstitute.org/freefont/", 75],
  ["The Verge – Browsers are getting tab groups right, finally", "https://www.theverge.com/2026/11/20/browser-tab-groups", 60],
]

const tabs = empty
  ? []
  : open.map(([title, url, hoursAgo], i) => ({
      id: 100 + i,
      windowId: i < 20 ? 1 : 2,
      index: i < 20 ? i : i - 20,
      url,
      title,
      favIconUrl: "",
      active: i === 0 || i === 20,
      pinned: i === 5,
      audible: i === 23,
      discarded: false,
      lastAccessed: NOW - hoursAgo * H,
    }))

const iso = (ms: number) => new Date(ms).toISOString()
const store: Record<string, unknown> = {
  themeMode: params.get("theme") === "dark" ? "dark" : "light",
  onboardingDismissed: false,
  tabGroups: empty
    ? []
    : [
        {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Later",
          pinned: true,
          createdAt: iso(NOW - 30 * D),
          updatedAt: iso(NOW - 2 * H),
          tabs: [
            { url: "https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/", title: "A Friendly Introduction to Spring Physics" },
            { url: "https://web.dev/articles/prefers-reduced-motion", title: "prefers-reduced-motion: Sometimes less movement is more" },
            { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Designing calm software — talk" },
            { url: "https://overreacted.io/the-two-reacts/", title: "The Two Reacts — overreacted" },
            { url: "https://www.amazon.in/dp/B0C1234567", title: "Desk shelf organiser, walnut" },
            { url: "https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies", title: "Storage and cookies | Chrome for Developers" },
          ].map((t, i) => ({ ...t, favIconUrl: null, position: i })),
        },
        {
          id: "b2",
          name: "Auth research",
          pinned: true,
          createdAt: iso(NOW - 3 * D),
          updatedAt: iso(NOW - 3 * D),
          tabs: [
            { url: "https://developer.chrome.com/docs/extensions/how-to/integrate/oauth", title: "OAuth 2.0: authenticate users with Google" },
            { url: "https://developers.google.com/identity/protocols/oauth2/native-app#step-2:-send-a-request-to-googles-oauth-2.0-server", title: "OAuth 2.0 for Mobile & Desktop Apps" },
            { url: "https://datatracker.ietf.org/doc/html/rfc7636", title: "RFC 7636 – Proof Key for Code Exchange" },
            { url: "https://github.com/brave/brave-browser/issues/2525", title: "chrome.identity.getAuthToken not supported · Issue #2525 · brave/brave-browser" },
          ].map((t, i) => ({ ...t, favIconUrl: null, position: i })),
        },
        {
          id: "b3",
          name: "Window · Nov 24, 9:12 PM",
          pinned: false,
          createdAt: iso(NOW - 1 * D),
          updatedAt: iso(NOW - 1 * D),
          tabs: [
            { url: "https://tailwindcss.com/docs/theme", title: "Theme variables - Core concepts - Tailwind CSS" },
            { url: "https://ui.shadcn.com/docs/components/command", title: "Command - shadcn/ui" },
            { url: "https://www.radix-ui.com/primitives/docs/components/dropdown-menu", title: "Dropdown Menu – Radix Primitives" },
            { url: "https://lucide.dev/icons/", title: "Lucide Icons" },
            { url: "https://github.com/pacocoursey/cmdk", title: "pacocoursey/cmdk: Fast, unstyled command menu React component" },
          ].map((t, i) => ({ ...t, favIconUrl: null, position: i })),
        },
      ],
}

const storageChanged = event()
const tabEvents = {
  onCreated: event(),
  onRemoved: event(),
  onUpdated: event(),
  onActivated: event(),
  onAttached: event(),
  onReplaced: event(),
}

function pick(keys?: string | string[] | null) {
  if (keys == null) return { ...store }
  const list = Array.isArray(keys) ? keys : [keys]
  const out: Record<string, unknown> = {}
  for (const k of list) if (k in store) out[k] = structuredClone(store[k])
  return out
}

const mock = {
  runtime: {
    id: "najlilhbfkkocnnhfaofffpfehcipahe",
    lastError: undefined,
    getURL: (p: string) => p,
    getManifest: () => ({ version: "0.4.0", oauth2: { client_id: "INJECTED_FROM_ENV_AT_BUILD" } }),
    sendMessage: (_msg: unknown, cb?: (r: unknown) => void) => {
      const r = { success: true }
      cb?.(r)
      return Promise.resolve(r)
    },
  },
  storage: {
    local: {
      get: (keys?: string | string[] | null, cb?: (r: Record<string, unknown>) => void) => {
        const r = pick(keys)
        cb?.(r)
        return Promise.resolve(r)
      },
      set: (data: Record<string, unknown>, cb?: () => void) => {
        const changes: Record<string, { oldValue: unknown; newValue: unknown }> = {}
        for (const [k, v] of Object.entries(data)) {
          changes[k] = { oldValue: store[k], newValue: structuredClone(v) }
          store[k] = structuredClone(v)
        }
        storageChanged.fire(changes, "local")
        cb?.()
        return Promise.resolve()
      },
      remove: (keys: string | string[]) => {
        for (const k of Array.isArray(keys) ? keys : [keys]) delete store[k]
        return Promise.resolve()
      },
    },
    onChanged: storageChanged,
  },
  tabs: {
    query: async () => structuredClone(tabs),
    update: async (id: number) => {
      for (const t of tabs) if (t.windowId === tabs.find((x) => x.id === id)?.windowId) t.active = t.id === id
      tabEvents.onActivated.fire()
      return tabs.find((t) => t.id === id)
    },
    create: async ({ url }: { url: string }) => {
      const t = { id: 900 + tabs.length, windowId: 1, index: tabs.length, url, title: url, favIconUrl: "", active: false, pinned: false, audible: false, discarded: false, lastAccessed: Date.now() }
      tabs.push(t)
      tabEvents.onCreated.fire(t)
      return t
    },
    remove: async (ids: number | number[]) => {
      for (const id of Array.isArray(ids) ? ids : [ids]) {
        const i = tabs.findIndex((t) => t.id === id)
        if (i >= 0) tabs.splice(i, 1)
      }
      tabEvents.onRemoved.fire()
    },
    discard: async (id: number) => {
      const t = tabs.find((x) => x.id === id)
      if (!t || t.active) throw new Error("Cannot discard")
      t.discarded = true
      tabEvents.onUpdated.fire(id, { discarded: true })
      return t
    },
    ...tabEvents,
  },
  windows: {
    update: async () => ({}),
    create: async ({ url }: { url: string[] }) => {
      for (const u of url) await mock.tabs.create({ url: u })
      return {}
    },
  },
  identity: {
    getRedirectURL: () => "https://najlilhbfkkocnnhfaofffpfehcipahe.chromiumapp.org/",
    getAuthToken: (_o: unknown, cb: (t?: string) => void) => {
      ;(mock.runtime as { lastError?: { message: string } }).lastError = { message: "Preview mode: sign-in needs the real extension." }
      cb(undefined)
      mock.runtime.lastError = undefined
    },
    launchWebAuthFlow: async () => {
      throw new Error("Preview mode: sign-in needs the real extension.")
    },
    removeCachedAuthToken: async () => {},
  },
}

;(globalThis as unknown as { chrome: unknown }).chrome = mock
console.info("[TooManyTabs] running with mocked chrome APIs (preview mode)")
