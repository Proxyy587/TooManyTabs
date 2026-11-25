# TooManyTabs product

## USP
**Tabs, sorted. Every tab you have open or saved, on one page that files itself, so you can find it, keep it or close it in seconds, all on your device.**

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
| 10 | **Smart filters**: Twins, Dusty, Safe to close, plus categories (Docs, Code, Work…) and **your own categories** (name + sites + words). A built-in category only shows when it spans two or more sites. | ✅ on-device rules | Sorting you never maintain. The engine is deterministic and private; nothing leaves the device. A model-based layer (natural-language "show my research tabs") is a later add-on over the same filters. |
| 10b | "File this site under…" on any tab, and "Copy shelf as a list" | ✅ | Fixes a wrong guess in two clicks; shares a shelf as Markdown. |
| 10c | Insights panel on wide screens: what needs attention (one-click fixes) and where your tabs go | ✅ | Fills the page with something useful and turns clutter into an action. |
| 11 | Bookmarks and history in the same search | ⏳ later | Needs the `bookmarks`/`history` permissions. Add it once the core page is loved. |
| 12 | Live memory numbers per tab | ⏳ later | `chrome.processes` is only available on the dev channel. We show snoozing, which really frees memory, rather than invent numbers. |
| 13 | Auto-sessions (a timeline of past windows) and workspaces | ⏳ later | Shelves cover the need today. |
| 14 | Sync of settings | ⏳ later | Only shelves sync now. |

## Non-goals
- Folders and tags. Categories are derived, not maintained by hand.
- A new-tab-page takeover.
- Collaboration.

## Success criteria
- A first-time user saves their window and finds a saved tab again without reading anything.
- It works and looks right from a 360 px popup-width window up to a wide tab, in light and dark.
- No overlapping controls and no repeated text in rows.


## Research: what people do with too many tabs
Observed behaviour, from how heavy tab users describe their habits (and why bookmarks fail them):

1. **A tab is a to-do.** "I'll read it later" lives in the tab strip. People are afraid to close it and then forget why they opened it.
2. **Hoard first, sort never.** Nobody files things into folders at the moment of saving. If saving needs a decision, they don't save. Bookmarks demand a decision; we don't.
3. **Sessions around a task.** A trip, a purchase, a bug, a paper. Tabs belong to a short-lived project, then go stale all at once.
4. **Duplicates and re-opens.** The same page opened five times because finding the first one is harder than opening it again.
5. **Dread of losing work.** A crash or a mistaken close is the nightmare, so people never close anything.
6. **Mixed contexts.** Work, personal and a half-finished purchase share one strip.
7. **Retrieval by memory, not by folder.** "It was a blue page about OAuth" beats "Bookmarks → Dev → Auth → 2024".

### What Chrome bookmarks (and OneTab / Toby / Workona / Session Buddy) don't do
| Gap | Bookmarks | Others | TooManyTabs |
|---|---|---|---|
| Sees what's open right now | no | partly | **yes, all windows, with saved tabs in one list** |
| Sorts itself | no (manual folders) | no, or paid | **yes, on-device, plus your own categories** |
| Tells you what's safe to close | no | no | **yes: duplicates, already saved, untouched for days** |
| One-click clean-up | no | "send all" dumps everything | **targeted: close extras, close saved, snooze dusty** |
| Search across open and saved | separate | partly | **one box, ⌘K, keyboard first** |
| Undo | no | rarely | **everywhere** |
| Your data stays yours | synced to Google | accounts and paywalls | **local first; sync is optional** |
| Needs upkeep | yes | yes | **no** |

### The USP in one line
Bookmarks are a filing cabinet you have to maintain. TooManyTabs is a tidy desk that tidies itself: it knows what's open, what's saved and what's safe to close, and asks you for nothing.

## Feature backlog, ranked by relief and effort
Relief = how much anxiety or time it removes. ✅ shipped, 🔜 next.

| # | Idea | Relief | Effort | Status |
|---|---|---|---|---|
| 1 | Smart filters and custom categories | high | M | ✅ |
| 2 | Safe to close (open and already saved) | high | S | ✅ |
| 3 | Copy a shelf as a list; export | med | S | ✅ list, ✅ JSON |
| 4 | **Recently closed**: a list of the last closed tabs and windows, one click to bring them back | high (fear of losing) | S | 🔜 |
| 5 | **Remind me**: "bring this back tomorrow / Monday" (close now, reopen later, via alarms) | high (tab as to-do) | M | 🔜 |
| 6 | **Why**: an optional one-line note on a saved tab ("compare prices") | med | S | 🔜 |
| 7 | **Auto-save sessions**: snapshot each window so a crash or a mistaken close is recoverable | high | M | 🔜 |
| 8 | **Auto-archive**: opt-in, dusty tabs older than N days move to a "Dusty" shelf | med | S | 🔜 |
| 9 | **Bookmarks and history in the same search** (needs two permissions) | med | M | ⏳ |
| 10 | **Workspaces**: a switchable set (Work / Personal) that hides the other's tabs | med | L | ⏳ |
| 11 | **Import** from Chrome bookmarks, OneTab and Toby exports | med (switching cost) | M | ⏳ |
| 12 | **Tab budget**: a soft limit ("you have 40 open") with a nudge, never a block | low-med | S | ⏳ |
| 13 | Model-based filters: "show my research tabs" over the same filter model | med | L | ⏳ opt-in, on-device model only |

Rules for adding to this list: it must reduce a decision (not add one), work with the keyboard, be undoable, and keep data on the device.
