# TooManyTabs — Setup Guide

Full-stack Chrome/Edge/Brave extension: local tab groups + cloud sync.

## Architecture

```
public/background.js   → MV3 service worker (auth, local storage, sync)
src/App.tsx            → React UI (talks to background via chrome.runtime)
server/                → Express + Drizzle + Neon Postgres
```

**Data model:** named `tabGroups` in `chrome.storage.local`, mirrored to Postgres (`tab_groups` + `tabs` + `devices`).

**Auth:** `chrome.identity.launchWebAuthFlow` → Google `id_token` → backend verifies → JWT access + refresh token.

**Sync:** on login, every 5 minutes, and on every local change → `POST /sync/push` then `GET /sync/pull` (last-write-wins).

---

## 1. Backend

```bash
cd server
bun install
cp .env.example .env
# edit .env with DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID
```

Push the schema to Neon (drops old `sessions` table — this is a clean v2 schema):

```bash
bun run db:push
```

Start the API:

```bash
bun run dev
```

Health check: http://localhost:3000/health

---

## 2. Google OAuth (fixes "Access blocked / invalid_request")

Google blocks the old `id_token` implicit flow for many apps (that's the 400 you saw under a project name like "seguroamigo"). TooManyTabs now uses **authorization code + PKCE**.

### Create the correct client

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. **Create Credentials → OAuth client ID**
3. Application type: **Web application** (not "Chrome Extension")
4. Under **Authorized redirect URIs** add exactly:
   ```
   https://ehbjaffafbfjjnmbljpicecdhbioafjj.chromiumapp.org/
   ```
   (If your extension ID differs after a reinstall, use `chrome.identity.getRedirectURL()` from the service worker console.)
5. Copy **Client ID** and **Client secret**

### Put them in config

`server/.env` (both required):
```env
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-....
```

Same Client ID in:
- `public/manifest.json` → `oauth2.client_id`
- `public/background.js` → `GOOGLE_CLIENT_ID`

Then restart the server and reload the extension.

### Why login failed before

| Cause | Fix |
|-------|-----|
| Implicit `id_token` flow blocked | Now uses auth code + PKCE |
| Client type "Chrome Extension" used with WebAuthFlow | Use **Web application** |
| Redirect URI missing | Must match `….chromiumapp.org/` exactly |
| Missing client secret | Required for code exchange on the server |

---

## 3. Build & load the extension

From the repo root:

```bash
bun install          # or npm install
bun run build        # or npm run build
```

Then in Chrome / Edge / Brave:

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder
4. Note the extension ID; finish OAuth redirect URI setup above
5. Reload the extension after updating the Client ID / redirect URI

---

## 4. Use it

| Action       | How                                                              |
| ------------ | ---------------------------------------------------------------- |
| Open UI      | Click the extension icon, or right-click page → Open TooManyTabs |
| Save tabs    | "Save Session" (prompts for group name) or context menu          |
| Sign in      | "Sign in with Google" in the header                              |
| Sync         | Automatic after login + every 5 min; or click the refresh icon   |
| Search       | Search bar filters groups + tab titles/URLs                      |
| Duplicates   | Banner appears when open tabs share the same URL                 |
| Pin / rename | Icons on each group                                              |

Local saves always work offline. Cloud sync runs when you're signed in and the server is reachable.

---

## API reference

| Method | Path                | Auth   | Purpose                                        |
| ------ | ------------------- | ------ | ---------------------------------------------- |
| POST   | `/auth/google`      | —      | `{ idToken, deviceName?, platform? }` → tokens |
| POST   | `/auth/refresh`     | —      | `{ refreshToken }` → new access token          |
| POST   | `/auth/logout`      | Bearer | Revoke current device                          |
| GET    | `/sync/pull?since=` | Bearer | Incremental group changes                      |
| POST   | `/sync/push`        | Bearer | Upsert dirty groups (LWW)                      |
| GET    | `/device`           | Bearer | List devices                                   |
| DELETE | `/device/:id`       | Bearer | Revoke a device                                |

---

## Troubleshooting

**Login fails with redirect / cancelled**

- Redirect URI must exactly match `chrome.identity.getRedirectURL()` (trailing slash matters)
- Client must be **Web application**, not "Chrome Extension" type alone

**Sync does nothing**

- Confirm you're signed in (email in header)
- `curl http://localhost:3000/health` — server running?
- Check service worker console: Extensions → TooManyTabs → "service worker" link

**Schema / DB errors**

```bash
cd server && bun run db:push
```

**Old `savedSessions` still in storage**

- Open the extension service worker console and run:
  `chrome.storage.local.remove(['savedSessions'])`
- Or clear extension storage from the extension details page
