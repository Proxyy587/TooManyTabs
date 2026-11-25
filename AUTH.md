# TooManyTabs — Google Auth (Chrome Extension)

## Why you see “Access blocked”

Almost always one of these:

1. **Wrong OAuth client type** — you created a **Web application** client (has a Client Secret).  
   `chrome.identity.getAuthToken` only works with application type **Chrome Extension** (no secret).
2. **Wrong Item ID** — Google Cloud Item ID ≠ loaded extension ID.
3. **Testing mode** — your Gmail is not listed under OAuth consent screen → Test users.
4. **Not Chrome** — Brave/Edge/Chromium forks often break `getAuthToken` (“Custom URI scheme is not supported”). Use **Google Chrome**.

Your repo currently has `GOOGLE_CLIENT_SECRET` in `.env`. That is the smoking gun for a **Web** client. Create a **new** Chrome Extension client and replace `GOOGLE_CLIENT_ID`. Leave the secret unused for this flow (or delete it from root `.env`).

Official guide: [Chrome OAuth how-to](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)

---

## Correct setup (do in order)

### 1. Confirm extension ID

After loading `dist/` in `chrome://extensions`, the ID must be:

```
najlilhbfkkocnnhfaofffpfehcipahe
```

That ID is pinned by the `key` field in `manifest.json`. Settings → Account also shows it.  
If it differs, you loaded the wrong folder (use `dist/`, not `public/` or `src/`).

### 2. Google Cloud → OAuth consent screen

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. User type: **External**
3. Publishing: **Testing** is fine
4. **Test users** → add the exact Gmail you use in Chrome
5. Scopes: email + profile is enough (requested by the extension)

### 3. Create a Chrome Extension OAuth client

1. [Credentials](https://console.cloud.google.com/apis/credentials) → **Create credentials** → **OAuth client ID**
2. Application type: **Chrome Extension** (not Web, not Desktop)
3. Name: `TooManyTabs`
4. Item ID: `najlilhbfkkocnnhfaofffpfehcipahe`
5. Create → copy **Client ID only**  
   There is **no** Client Secret for this type. If Google shows a secret, you picked the wrong type.

### 4. Put Client ID in root `.env`

```env
GOOGLE_CLIENT_ID=PASTE_CHROME_EXTENSION_CLIENT_ID.apps.googleusercontent.com
API_BASE_URL=http://localhost:3000
```

- Do **not** put a Web-client secret in root `.env` for getAuthToken.
- Mirror the same `GOOGLE_CLIENT_ID` in `server/.env` (optional for access-token login).

### 5. Build + reload

```bash
# API
cd server && bun run dev

# Extension (repo root)
bun run build
```

Build must print:

```
[build] oauth2.client_id ← YOUR_NEW_ID...
[build] Extension ID must be: najlilhbfkkocnnhfaofffpfehcipahe
```

If it warns about `GOOGLE_CLIENT_SECRET`, you are still on a Web client — fix step 3.

Then in Chrome:

1. `chrome://extensions` → Remove old TooManyTabs if ID is wrong
2. **Load unpacked** → select `dist/`
3. Confirm ID = `najlilhbfkkocnnhfaofffpfehcipahe`
4. Open TooManyTabs from the toolbar (full tab)
5. Settings → **Sign in with Google** → click **Allow**

---

## What the code does

```
.env GOOGLE_CLIENT_ID
  → bun run build → dist/manifest.json oauth2.client_id

TooManyTabs tab
  → chrome.identity.getAuthToken({ interactive: true })
      → Google access token
          → POST /auth/google { accessToken }
              → JWT in chrome.storage.local
```

Chrome extensions cannot read `.env` at runtime. Rebuild after every Client ID change.

---

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| **Access blocked** / request invalid / Bad client id | New **Chrome Extension** client + correct Item ID; rebuild; reload `dist/` |
| Access blocked + “verification” / not completed | Add your Gmail under **Test users** |
| “User did not approve access” | Click **Allow**; don’t close the Google window |
| Works in Chrome, fails in Brave | Use Chrome; Brave breaks getAuthToken |
| Sign-in OK, sync fails | Start API: `cd server && bun run dev` → `/health` |
| Extension ID changed | Always load `dist/` that includes `key` |
| Still old Client ID | Forgot `bun run build` or loaded wrong folder |

Verify injected ID:

```bash
grep client_id dist/manifest.json
```

---

## Do not use

| Approach | Why |
| -------- | --- |
| Web application client + secret for getAuthToken | Causes Access blocked / invalid_request |
| `launchWebAuthFlow` / localhost Google redirects as primary | Not the Chrome Identity path for this app |
| Loading `public/` or `src/` as the extension | Missing injected Client ID / wrong build |
