# TooManyTabs — Setup Guide

Full-stack Chrome/Edge/Brave extension: local tab groups + cloud sync.

## Architecture

```
public/background.js   → MV3 service worker (Chrome Identity auth, sync)
src/App.tsx            → React UI (chrome.runtime messages)
server/                → Express + Drizzle + Neon Postgres
```

**Auth:** see root **[AUTH.md](../AUTH.md)**.  
`bun run build` injects root `.env` → `GOOGLE_CLIENT_ID` into `dist/manifest.json`.

**Sync:** on login, every 5 minutes, and on local changes → `POST /sync/push` then `GET /sync/pull`.

---

## 1. Backend

```bash
cd server
bun install
cp .env.example .env
# fill DATABASE_URL, JWT_SECRET
bun run db:push
bun run dev
```

Health: http://localhost:3000/health — Ctrl+C stops the server.

---

## 2. Google OAuth (Chrome Extension client)

### Why the old setup failed

| Wrong (what we tried) | Right (Chrome docs) |
| --------------------- | ------------------- |
| OAuth type: **Web application** | OAuth type: **Chrome Extension** |
| Redirect: `http://localhost:3000/...` | No redirect URI — Chrome handles it |
| `launchWebAuthFlow` / custom browser OAuth | `chrome.identity.getAuthToken({ interactive: true })` |
| Error 400: `invalid_request` (seguroamigo) | Works when Item ID matches extension ID |

### A. Stable extension ID

This repo already pins the ID via `manifest.json` → `"key"`.

**Extension ID:** `najlilhbfkkocnnhfaofffpfehcipahe`

After `bun run build`, load unpacked `dist/` and confirm that ID on `chrome://extensions`.

### B. Create the OAuth client

1. Open [Google Cloud → Credentials](https://console.cloud.google.com/apis/credentials)
2. Configure the **OAuth consent screen** if prompted (External / Testing is fine; add your Google account as a test user)
3. **Create Client** → application type: **Chrome Extension**
4. Name: `TooManyTabs`
5. **Item ID:** `najlilhbfkkocnnhfaofffpfehcipahe`
6. Create → copy the **Client ID**  
   (there is **no** client secret for this type — that is normal)

### C. Put the Client ID in the extension

Edit `public/manifest.json`:

```json
"oauth2": {
  "client_id": "PASTE_YOUR_CHROME_EXTENSION_CLIENT_ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
  ]
}
```

Optionally set the same ID in `server/.env` as `GOOGLE_CLIENT_ID=` (not required for access-token login, but useful for consistency).

### D. Rebuild & reload

```bash
bun run build
```

1. `chrome://extensions` → **Reload** TooManyTabs (or Load unpacked → `dist/`)
2. Confirm ID is still `najlilhbfkkocnnhfaofffpfehcipahe`
3. Open TooManyTabs → **Sign in**
4. Chrome shows the Google account picker → allow → you should be signed in

---

## 3. Build & load the extension

```bash
bun install
bun run build
```

1. `chrome://extensions` → Developer mode on  
2. **Load unpacked** → select `dist/`  
3. Click the extension icon (or right-click page → Open TooManyTabs)

---

## 4. Use it

| Action    | How |
| --------- | --- |
| Open UI   | Extension icon / context menu |
| Save tabs | Save in UI or context menu |
| Sign in   | Sign in button (Chrome Identity popup) |
| Sync      | Automatic after login + every 5 min |

Local saves always work offline. Cloud sync needs sign-in + running server.

---

## API reference

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| POST | `/auth/google` | — | `{ accessToken }` from `getAuthToken` → our JWT |
| POST | `/auth/refresh` | — | Refresh access JWT |
| POST | `/auth/logout` | Bearer | Revoke device |
| GET | `/sync/pull?since=` | Bearer | Pull group changes |
| POST | `/sync/push` | Bearer | Push dirty groups |
| GET | `/device` | Bearer | List devices |
| DELETE | `/device/:id` | Bearer | Revoke device |

---

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `bad client id` / OAuth error | Client type must be **Chrome Extension**, not Web |
| `OAuth2 request failed` / Extension ID mismatch | Item ID must be exactly `najlilhbfkkocnnhfaofffpfehcipahe` |
| `The user did not approve access` | You closed/cancelled the Google popup, or consent failed | Click **Allow** (don’t close). Add your email as a **Test user**. Clear site data / try again |
| Sign-in from popup closes instantly | Interactive OAuth needs a real tab | Open TooManyTabs via the extension icon (full tab), then Sign in |
| Extension ID mismatch | Item ID ≠ loaded extension ID | Must be `najlilhbfkkocnnhfaofffpfehcipahe` in Cloud Console |
