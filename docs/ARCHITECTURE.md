# TooManyTabs — Architecture

## Overview

```
React Shelf UI ──messages──► background.js (MV3 SW)
       │                            │
       └── chrome.storage.local ◄───┘
                                    │
                         JWT sync ──► Express API ──► Neon Postgres
       │
       └── chrome.identity.getAuthToken ──► POST /auth/google
```

## Layers

| Layer | Path | Role |
|-------|------|------|
| Extension UI | `src/` | Shelf, Park, Settings (Vite + React 19) |
| Service worker | `public/background.js` | Context menus, restore, sync alarms, token exchange |
| Manifest | `public/manifest.json` | MV3, identity, oauth2 client_id (injected at build) |
| API | `server/` | Auth, sync push/pull, devices (Express + Drizzle) |
| DB | Neon Postgres | `users`, `devices`, `tab_groups`, `tabs` |

## Local data model

`chrome.storage.local.tabGroups[]`:

```ts
{
  id: string
  name: string          // "Later" is the default inbox name
  pinned: boolean
  tabs: { url, title, favIconUrl, position }[]
  updatedAt: string
  deleted?: boolean
  dirty?: boolean
}
```

Prefs (same storage): `themeMode`, `themeAccent`, `viewMode`, `closeOnPark`, `onboardingDismissed`, auth tokens, `lastSyncedAt`, `lastSyncError`.

## Sync

- Guest: full local use, no network required
- Signed in: push dirty groups on change; pull every 5 minutes + manual refresh
- Conflict: last-write-wins by `updatedAt`

## Auth

Chrome Extension OAuth client + `chrome.identity.getAuthToken` in the extension page → access token → `POST /auth/google` → JWT.  
Root `.env` `GOOGLE_CLIENT_ID` is injected into `dist/manifest.json` at `bun run build`.

## UI composition (0.3+)

```
src/
  App.tsx                 # view state: shelf | settings
  features/shelf/         # ShelfHome, ParkModal, SyncChip, Onboarding
  features/settings/      # SettingsPage
  components/brand/       # CubeMark, Credits
  lib/api.ts              # storage + messaging
  index.css               # design tokens
```
