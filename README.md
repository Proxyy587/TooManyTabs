# TooManyTabs

**Your go-to tab shelf** — park tabs, find them fast, restore when ready. Local-first; sync optional.

## Docs

| Doc | What |
|-----|------|
| [docs/PRODUCT.md](./docs/PRODUCT.md) | Thesis, features, non-goals |
| [docs/DESIGN.md](./docs/DESIGN.md) | Pixel/vexel design system |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Extension + API + data |
| [docs/CHANGELOG.md](./docs/CHANGELOG.md) | Version history |
| [docs/AGENT_PROMPT.md](./docs/AGENT_PROMPT.md) | Implementation agent prompt |
| [AUTH.md](./AUTH.md) | Chrome Extension Google OAuth |
| [server/SETUP.md](./server/SETUP.md) | Backend setup |

## Quick start

### 1. Backend

```bash
cd server
bun install
cp .env.example .env   # DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID
bun run db:push
bun run dev            # http://localhost:3000
```

### 2. Extension

```bash
# repo root — put GOOGLE_CLIENT_ID + API_BASE_URL in .env
bun install
bun run build
```

Load unpacked → `chrome://extensions` → select **`dist/`**.

### 3. Google OAuth

Use a **Chrome Extension** OAuth client (not Web). See [AUTH.md](./AUTH.md).  
`bun run build` injects `GOOGLE_CLIENT_ID` from root `.env` into `dist/manifest.json`.

## Features (0.3)

- **Later** inbox + named shelves
- Park open tabs (partial select; close tabs opt-in)
- Search, list/grid, restore one or all
- Move tabs between shelves
- Local-first; optional cloud sync
- Settings, export/import, sync status
- Pixel/vexel blue identity

## Project structure

```
TooManyTabs/
├── docs/                 # Product + design + agent prompt
├── public/               # manifest, background.js → dist/
├── src/
│   ├── App.tsx
│   ├── features/shelf/
│   ├── features/settings/
│   ├── components/brand/
│   └── lib/api.ts
└── server/               # Express + Drizzle + Neon
```

by Abhijit
