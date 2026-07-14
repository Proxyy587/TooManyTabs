# TooManyTabs

Save, organize, and sync browser tabs across Chrome, Edge, and Brave.

## Quick start

### 1. Backend

```bash
cd server
bun install
cp .env.example .env   # fill DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID
bun run db:push
bun run dev            # http://localhost:3000
```

Full OAuth + Neon setup: [server/SETUP.md](./server/SETUP.md)

### 2. Extension

```bash
# from repo root
bun install
bun run build
```

Load unpacked in `chrome://extensions` → select the `dist/` folder.

### 3. Google OAuth

Use a **Web application** OAuth client. Add this redirect URI (after loading the extension once to get its ID):

```
https://<EXTENSION_ID>.chromiumapp.org/
```

Put the same Client ID in `server/.env`, `public/manifest.json`, and `public/background.js`.

## Features (v1)

- Named tab groups (save / restore / rename / pin / delete)
- Local storage always works offline
- Cloud sync when signed in (push on change + pull every 5 min)
- Cross-browser Google login via `launchWebAuthFlow`
- Search across saved groups
- Duplicate open-tab detection

## Project structure

```
TooManyTabs/
├── public/                 # Copied into dist/ by Vite
│   ├── manifest.json
│   ├── background.js       # Auth + local groups + sync
│   └── icon*.svg/png
├── src/                    # React UI
│   ├── App.tsx
│   └── lib/api.ts          # chrome.runtime message bridge
├── server/                 # Express + Drizzle + Neon
│   ├── routes/auth|sync|device
│   └── db/schema.ts
└── dist/                   # Load this as unpacked extension
```

## Scripts

| Command | What it does |
|---------|----------------|
| `bun run build` | Build extension into `dist/` |
| `bun run server` | Start API on :3000 |
| `bun run db:push` | Push Drizzle schema to Neon |
