# Changelog

## Unreleased — Pixel world

### Added
- **Six themes** (Pip, Dusk, Mint, Peach, Sky, Bubblegum), each in light and dark, switchable from the sidebar, Settings → Look or ⌘K
- Row **density** (Cozy / Compact)
- Settings rebuilt as a side-nav layout with live theme previews

### Changed
- Stair-stepped pixel corners, hard shadows and chunky buttons everywhere; no more capsules
- Pixel headings for shelves and settings; layout stays one minimal column
- "Open twice" and "playing" show as chips

### Fixed
- Keyboard focus ring always shows on buttons, tabs and rows

## 0.3.0 — Shelf Revamp

### Added
- **Later** inbox shelf (auto-created)
- **Park** modal with partial tab select; close-tabs off by default
- **Settings** page (Appearance, Behavior, Account & Sync, Data, About)
- Sync status chip (Offline / Syncing / Synced / Error)
- Move tab between shelves
- Export / import JSON backup
- First-run onboarding tip strip
- Rubik-inspired pixel/vexel design system + `by Abhijit` credits

### Changed
- Close-on-save → opt-in (`closeOnPark`)
- “Auto” grouping labeled **Sort by site**
- Brand typography: Geist Pixel (display) + readable sans body
- Product docs under `docs/`

### Fixed
- Orphan settings/theme UI replaced by real Settings
- Clearer empty states and Park CTAs

## 0.2.0

- Named groups, local-first storage, optional cloud sync
- Google auth via Chrome Identity
- Search, duplicates, pin/rename/merge
