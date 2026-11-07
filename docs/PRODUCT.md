# TooManyTabs — Product

## Thesis

**TooManyTabs is your go-to tab shelf** — park tabs in named shelves, find them in seconds, restore when ready. Local-first; sync is optional gravy.

Not a session manager dump. Not a second bookmarks bar. A **daily parking lot + retrieval tool**.

## Audience

People with 20–100+ open tabs who need “save this mess / get it back later” without learning a complex system.

## Jobs to be done

1. **Park** — Get tabs off my screen without losing them.
2. **Find** — Retrieve a parked tab by name, site, or shelf in seconds.
3. **Restore** — Open one tab or a whole shelf when I’m ready.
4. **Trust** — Work offline; sync across devices when I want.

## Complexity bar

Middle: one primary action (**Park**), one primary browse surface (**Shelf**), **Settings** for power users. No tags, graphs, or workspaces in v1.

## Product faults (pre-0.3)

1. Monolithic App + orphaned unused UI components
2. Aggressive close-on-save (felt like a session killer)
3. No Settings page
4. Sync/auth status opaque
5. Hard to reorganize (`moveTabToGroup` unused; merge hidden)
6. No default **Later** inbox
7. No partial park (always whole window)
8. Doc drift vs reality
9. Generic visual identity

## Feature map (0.3 Shelf Revamp)

| Area | Behavior |
|------|----------|
| Later | Auto-created inbox; one-click “Park to Later” |
| Park | Select which open tabs; destination Later / shelf / new; close-tabs **off by default** |
| Shelf | Filter: Later · All · pinned · named shelves |
| Move | Move a tab between shelves |
| Sync chip | Offline · Syncing · Synced · Error |
| Settings | Appearance, Behavior, Account & Sync, Data, About |
| Export/Import | JSON of `tabGroups` |
| Onboarding | Dismissible 3-step tip (Park → Find → Restore) |
| Credits | Footer `by Abhijit` |

## Non-goals (this revamp)

Tags, notes, reading-time, analytics, side panel, new-tab takeover, multi-window park, AI summaries, collaboration.

## Success criteria

- Park to Later in ≤2 clicks without reading docs
- Settings one click away; close-on-save controllable
- Unmistakable blue pixel shelf identity
- Daily loop: Park → Search → Restore feels obvious
- One shelf screen + Settings — not a dashboard
