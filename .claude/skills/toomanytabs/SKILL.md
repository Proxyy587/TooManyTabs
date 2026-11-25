---
name: toomanytabs
description: Repo rules, build and verify steps for the TooManyTabs Chrome extension (Vite + React + shadcn/ui page, MV3 service worker, Express/Drizzle sync server). Use for any change in this repo, before committing, and whenever you need to build, test, preview, screenshot or debug Google sign-in.
---

# Working on TooManyTabs

## Map
- `src/` is the extension page (one page: open + saved tabs). `src/App.tsx` → `features/board/*`, `features/settings/*`.
- `src/lib/api.ts` is local storage for shelves and prefs. Every write goes through `mutateGroups()` (keeps tombstones, serialised). Never write `tabGroups` any other way.
- `src/lib/auth.ts` is Google sign-in (getAuthToken → launchWebAuthFlow fallback).
- `src/lib/items.ts` is the one item model plus filters and duplicates. `src/lib/categories.ts` is the smart-category engine: kept and tested, **not shown in the UI** (owner's call, 2026-11-25).
- `public/background.js` is the MV3 worker: context menus, keyboard commands, quick saves, sign-in hand-off, sync. Plain JS, no bundler.
- `server/` is Express + Drizzle on Postgres (Neon). `server/lib/google.ts` verifies Google identity.
- `docs/` has ARCHITECTURE, BRAND, PRODUCT, FIXES and CHANGELOG. `AUTH.md` is the owner's Google Cloud checklist.

## Hard rules
- **Secrets:** `.env` and `server/.env` hold secrets. Never print, commit or send their values; read key names only. The build fails if a server secret appears in `dist/`.
- **Auth claims:** say sign-in works only after you've clicked through it in a real browser. Otherwise mark it UNVERIFIED and name the missing step.
- **Licences:** MIT/Apache/BSD/OFL only. Add anything bundled to `THIRD_PARTY.md`.
- **dusk.bot** is PolyForm Noncommercial: principles only (see `dusk-feel`), never its code, CSS, copy or assets.
- **Git:** one focused Conventional Commit per task. Work on a branch, then `git merge --no-ff` into `main` once it's built and verified, and push `main`.

## Build, test, verify
```bash
npm install
npm test            # vitest: classifier, filters, auth helpers, server audience check
npm run lint
npm run build       # tsc -b + vite build + manifest/env injection; must be clean
npm run brand       # regenerate icons from src/brand/pip.json (only when Pip changes)
npm run server      # API on :3000 (needs bun; or: cd server && npx tsx index.ts)
```
Load `dist/` unpacked at `chrome://extensions`. The ID must be `najlilhbfkkocnnhfaofffpfehcipahe` (pinned by the manifest `key`).

### Look at it (required for UI changes)
`npx vite preview --port 4173` serves `dist/`. Outside the extension, `src/dev/chromeMock.ts` loads sample tabs and shelves.
- `?theme=dark` starts in dark mode; `?mock=empty` shows the empty state.
- Screenshot at about 400 px and 1400 px wide, light and dark, with menus and dialogs open. Then read the images and fix what you see.
- `agent-browser` needs `AGENT_BROWSER_EXECUTABLE_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"` and its own `--session`.

### Auth checks you can run without a browser
- `grep -c client_id dist/manifest.json` should be 1 when `GOOGLE_EXTENSION_CLIENT_ID` (or legacy `GOOGLE_CLIENT_ID`) is set.
- POST bogus bodies to `/auth/google` on a throwaway server with dummy env. Expect 400 for a missing body, 401 for a bad token, 400 for a non-chromiumapp redirect.
