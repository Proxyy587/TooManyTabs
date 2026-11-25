---
name: tmt-design
description: TooManyTabs brand, component and motion rules (six themeable palettes, stair-step pixel surfaces, ink primary with a lip, Pip the pixel mascot and sprites, Pixelify Sans + Atkinson Hyperlegible Next, shadcn/ui restyled). Use whenever you add or change anything visible in src/, write UI copy, or review a screenshot of the extension.
---

# TooManyTabs design rules
Full rationale is in `docs/BRAND.md`. This is the checklist.

## The one idea
A minimal page with a pixel soul. Pip lives in it, the user picks the weather (a palette), and the page is stair-stepped tones, chunky buttons and tiny sprites. Playful, never noisy: one primary button, readable rows, nothing looping.

## Colour (tokens in `src/index.css`; never hard-code hex in components)
- **Six palettes × light/dark** via `data-palette` and `data-theme` on `<html>`. Add or change a palette in `src/index.css` AND `src/lib/palettes.ts`; `tests/palettes.test.ts` fails if they drift.
- **Surfaces are tones:** `ground` → `panel` (cards) → `panel-hover` (row hover). Menus and dialogs are `float`. Fields and tracks are `raised` / `raised-2`.
- **Text:** `ink`, `ink-2`, `ink-3` only.
- **Primary action:** the ink block (`<Button>` default) with a `brand` lip. One per view.
- **Secondary:** `variant="secondary"` (tonal) or `ghost` for icon buttons. `variant="brand"` only for a single "yes!" such as sign-in.
- **`brand` is a fill** (chips, Pip's banner, the settings nav, the lip). Put `on-brand` text on it; never colour text with `brand`. `link` is for focus and links.
- **Pip is always yellow**, whatever the palette.
- **Danger** is only for destructive menu items and errors.

## Pixel shapes
- Surfaces get stair-step corners from `.pix` (4px), `.pix-m` (3px) or `.pix-s` (2px). Set the colour with `[--pc:var(--raised)]`, and hover/active colours with `hover:[--pc:...]`. There is no `rounded-*` and no border.
- The notch sticks out by its size, so sibling gaps must be larger than that.
- Floating things add `pix-float`. Buttons use `pix-btn` (lip) or `pix-flat` (ghost).
- Focus is drawn by an unlayered rule in `index.css`; don't add `outline-none` expecting it to win, and don't remove the rule.
- Sprites come from `Sprite` (`src/components/brand/Sprite.tsx`), used only for Settings nav icons. Add new art as a text grid there, in theme colours only.

## Type
- **Display:** Pixelify Sans (`font-display`, or `px-title` for page titles with the drop). For the wordmark, page and section titles, settings pane titles, the meter mood and empty-state headlines. Never body text, buttons or row titles.
- **UI:** Atkinson Hyperlegible Next. Body 15 px, meta 13 px, three weights (400/500/600).
- **Copy:**
  - sentence case; the brand and pixel headings are lowercase;
  - a button says what happens ("Save 12 tabs", "Close extras");
  - a toast echoes it ("Saved 12 tabs to Later");
  - errors say what to do next.

## Components (shadcn/ui in `src/components/ui`, already restyled)
- Use `Button`, `Input`, `Dialog`, `DropdownMenu`, `Select`, `Tabs` (also the segmented control and the settings side nav), `Switch`, `Tooltip`, `CommandDialog` and `sonner` toasts.
- Don't hand-roll menus, popovers or modals.
- **Layout: stay minimal.** One centred column (max 720px). No sidebar, cards, scenery, hero titles or meters unless the owner asks.
- **Row anatomy (`features/board/Row.tsx`):**
  - favicon tile · title (once) · domain (once) + at most one fact;
  - notable facts ("open twice", "playing", "current tab") are chips; the rest is quiet text;
  - actions sit in their own grid column; with a mouse they show on hover/focus; on touch they always show;
  - never position menus absolutely inside a row.
- **Filters:** All / Open now / Saved plus the shelf select. No chip rows.

## Motion
| Kind | Feel |
|---|---|
| list rows (first paint only) | `.row-in` 180 ms fade + 4 px rise |
| menus, selects | `.menu-motion` 120 ms grow |
| dialogs | `.dialog-motion` / `.scrim-motion` 240 ms rise; 120 ms fade out |
| buttons | drop 2 px on press, in whole pixels |
| switch thumb, Pip hop | stepped (`steps(4)`), like a sprite |

- Ease is `cubic-bezier(0.22, 1, 0.36, 1)` for anything not stepped.
- Nothing loops at rest. The spinner only runs while syncing.
- `prefers-reduced-motion` keeps fades only.
- No motion library: CSS covers it.

## Responsive
- Works from 360 px to wide. Settings becomes full-screen below `sm` with a scrolling tab row.
- Check by screenshot at 400 px and 1400 px, light and dark, in at least two palettes.

## Accessibility
- Visible focus on everything (see Pixel shapes), a label on every icon button, tooltips on icon actions, dialogs titled.
- Rows are keyboard-reachable (`data-row`, j/k/arrows).
- Contrast: `ink-3` on `ground` is the floor for text; don't go lighter. Check any new palette in both modes.
