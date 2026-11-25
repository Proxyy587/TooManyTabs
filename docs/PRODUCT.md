# TooManyTabs product

## USP
**Every tab you have open or saved, on one calm page. Find it, save it or close it in seconds, all on your device.**

The browser's tab strip and bookmarks bar both hide things. TooManyTabs puts the open tabs from every window and everything you've saved on one searchable, keyboard-first page. Sync is optional.

## Who it's for
People with 20–100+ tabs across a few windows who want to clear the strip without losing anything, and get it back later in two keystrokes.

## The daily loop
1. **See:** one page, with open tabs (per window) and saved shelves together.
2. **Find:** type to search, or press ⌘K to jump straight to a tab.
3. **Act:** save (to Later, a shelf, or a new shelf), close, snooze, or restore. Every destructive action can be undone.

## Features, ranked
Ranked by how much each one helps that loop. ✅ is built in 0.4 and ⏳ is later.

| # | Feature | Status | Why it matters |
|---|---|---|---|
| 1 | One page: open tabs from all windows plus saved shelves | ✅ | The core promise. You stop hunting across windows and the bookmarks bar. |
| 2 | Search and simple filters (All / Open now / Saved, plus a shelf picker) | ✅ | Retrieval in seconds, and obvious to a first-time user. |
| 3 | Keyboard first: ⌘K command menu, `/`, j/k, Enter, `s`, ⌫, `?`, and global Alt+Shift+K / Alt+Shift+S | ✅ | Heavy tab users live on the keyboard. |
| 4 | Save dialog: pick tabs, choose a destination, optionally close them | ✅ | Save-and-close a whole window into one shelf in two clicks. The right-click menu also has "Save and close this window". |
| 5 | Duplicate tabs: flagged on the row, closed in one click (keeps the active copy) | ✅ | The most common waste, fixed instantly. |
| 6 | Snooze tabs you haven't looked at in N days (`chrome.tabs.discard`) | ✅ | Frees memory without closing anything. See the note below on live memory numbers. |
| 7 | Undo for close, remove and delete | ✅ | You can act fast without fear. |
| 8 | Local-first storage, export/import | ✅ | Your data stays yours and works offline. |
| 9 | Optional Google sign-in and sync between browsers | ✅ code, **UNVERIFIED** end to end | Needs the owner's Google Cloud steps (`AUTH.md`). |
| 10 | **AI-powered smart filters** ("show my research tabs", auto-grouped by topic) | ⏳ later | Owner's call: ship the simple UX first. An on-device category engine (`src/lib/categories.ts`, tested) is ready as a fallback and as training signal, but it isn't in the UI. |
| 11 | Bookmarks and history in the same search | ⏳ later | Needs the `bookmarks`/`history` permissions. Add it once the core page is loved. |
| 12 | Live memory numbers per tab | ⏳ later | `chrome.processes` is only available on the dev channel. We show snoozing, which really frees memory, rather than invent numbers. |
| 13 | Auto-sessions (a timeline of past windows) and workspaces | ⏳ later | Shelves cover the need today. |
| 14 | Sync of settings | ⏳ later | Only shelves sync now. |

## Non-goals (0.4)
- Category chips or grouping in the UI.
- Tags.
- A new-tab-page takeover.
- Collaboration.

## Success criteria
- A first-time user saves their window and finds a saved tab again without reading anything.
- It works and looks right from a 360 px popup-width window up to a wide tab, in light and dark.
- No overlapping controls and no repeated text in rows.
