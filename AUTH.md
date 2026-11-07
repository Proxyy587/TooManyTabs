# TooManyTabs — Auth setup (do this in order)

Chrome extensions **cannot** read `.env` at runtime.  
`bun run build` now copies `GOOGLE_CLIENT_ID` + `API_BASE_URL` from the **root** `.env` into `dist/manifest.json` and `dist/background.js`.

---

## 0. Critical: use a Chrome Extension OAuth client

`chrome.identity.getAuthToken` only works with:

- Application type: **Chrome Extension**
- Item ID: **`najlilhbfkkocnnhfaofffpfehcipahe`** (pinned by `manifest.json` → `key`)

If your client has a **Client Secret**, it is a **Web** client — that will keep failing.  
Create a **new** client of type **Chrome Extension** (no secret).

---

## 1. Google Cloud Console

1. Open [Credentials](https://console.cloud.google.com/apis/credentials)
2. **OAuth consent screen**
   - User type: External
   - Publishing status: **Testing** is fine
   - Add **Test users** → your Gmail (e.g. `abhijitbhattacharjee333@gmail.com`)
3. **Create Credentials → OAuth client ID**
   - Application type: **Chrome Extension**
   - Name: `TooManyTabs`
   - Item ID: `najlilhbfkkocnnhfaofffpfehcipahe`
4. Copy the **Client ID** only

---

## 2. Put the Client ID in `.env` (repo root)

Edit `/Users/abhijit/Developer/Projects/TooManyTabs/.env`:

```env
GOOGLE_CLIENT_ID=YOUR_NEW_CHROME_EXTENSION_CLIENT_ID.apps.googleusercontent.com
API_BASE_URL=http://localhost:3000
```

Mirror the same `GOOGLE_CLIENT_ID` in `server/.env` (optional for access-token login, good for consistency).

You do **not** need `GOOGLE_CLIENT_SECRET` for this flow.

---

## 3. Start the API

```bash
cd server
bun run dev
```

Leave it running. Ctrl+C stops it.  
Check: http://localhost:3000/health

---

## 4. Build the extension (injects env)

From repo root:

```bash
bun run build
```

You should see:

```
[build] oauth2.client_id ← YOUR_CLIENT_ID...
[build] API_BASE_URL     ← http://localhost:3000
```

Verify:

```bash
grep client_id dist/manifest.json
```

It must match `.env`, not the old `190659497018-…` ID.

---

## 5. Load / reload in Chrome

1. Open `chrome://extensions`
2. Developer mode ON
3. **Remove** the old TooManyTabs if the ID is wrong, then **Load unpacked** → select `dist/`
4. Confirm the extension ID is exactly:

   `najlilhbfkkocnnhfaofffpfehcipahe`

5. If the ID differs, the `key` in `manifest.json` didn’t load — reload from `dist/` again

---

## 6. Sign in

1. Click the TooManyTabs icon (opens a **tab**, not a tiny popup)
2. Click **Sign in**
3. In the Google window click **Allow** (do not close it)
4. You should land signed in; sync uses your JWT via the local API

---

## Flow (what the code does)

```
.env (GOOGLE_CLIENT_ID)
   └─ bun run build → dist/manifest.json oauth2.client_id

TooManyTabs tab
   └─ chrome.identity.getAuthToken({ interactive: true })
         └─ Google access token
               └─ background → POST http://localhost:3000/auth/google { accessToken }
                     └─ JWT + user saved in chrome.storage.local
```

---

## Troubleshooting

| Error / symptom | Fix |
| --------------- | --- |
| `Bad client id` | Client type must be **Chrome Extension**, Item ID = `najlilhbfkkocnnhfaofffpfehcipahe` |
| `The user did not approve access` | Click **Allow**; add yourself as Test user; don’t close the Google window |
| Sign-in works but sync fails | API not running — `cd server && bun run dev` |
| Still old client ID | You didn’t rebuild, or loaded wrong folder — rebuild and load `dist/` |
| Extension ID changed | Always load `dist/` that contains the `key` field |
| Web client + secret | Wrong type — create a Chrome Extension client |

---

## After it works

- Local groups work offline without login
- After login, dirty groups sync every 5 minutes + on changes
- Changing `.env` Client ID → always `bun run build` + reload extension
