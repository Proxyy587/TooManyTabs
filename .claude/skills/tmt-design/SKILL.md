---
name: tmt-design
description: TooManyTabs brand, component and motion rules (tonal neutrals, ink pill primary, Pip the pixel mascot, Pixelify Sans + Atkinson Hyperlegible Next, shadcn/ui restyled). Use whenever you add or change anything visible in src/, write UI copy, or review a screenshot of the extension.
---

# TooManyTabs design rules
Full rationale is in `docs/BRAND.md`. This is the checklist.

## The one idea
A calm, plain list of your tabs, with one pixel moment: **Pip**, the little yellow tab carrying a blue tab. Everything else is quiet.

## Colour (tokens in `src/index.css`; never hard-code hex in components)
- **Surfaces are tones:** `ground` → `raised` → `raised-2`. Popovers and dialogs are `popover` with `--shadow-float`. No borders except a 1px `border` between a dialog's list and its footer.
- **Text:** `ink`, `ink-2` (≈68%) and `ink-3` (≈56%) only.
- **Primary action:** the ink pill (`<Button>` default). One per view: "Save tabs" on the page, the confirm button in a dialog.
- **Secondary:** `variant="secondary"` (tonal pill) or `ghost` for icon buttons.
- **Brand accents:**
  - `pip` yellow is for Pip, text selection, avatars and the suggestion banner (`pip-soft`);
  - `tab-blue` is for focus, switches that are on and links.
  - Neither is ever a large fill.
- **Danger** is only for destructive menu items and errors.

## Type
- **Display:** Pixelify Sans (`font-display`). Only for the wordmark `toomanytabs`, empty-state headlines and Pip-adjacent moments. Never for body text, buttons or rows.
- **UI:** Atkinson Hyperlegible Next. Body 15 px, meta 13 px, three weights (400/500/600).
- **Copy:**
  - sentence case;
  - a button says what happens ("Save 12 tabs", "Close extras");
  - a toast echoes it ("Saved 12 tabs to Later");
  - errors say what to do next.
  - The brand name in the UI is lowercase `toomanytabs`; in prose it's TooManyTabs.

## Shape
- Radius: 6 (thumbs), 8 (small controls), 12 (rows, cards, inputs), 14 (menus, dialogs).
- Buttons, selects, tab tracks and toasts are capsules (`rounded-full`).

## Components (shadcn/ui in `src/components/ui`, already restyled)
- Use `Button`, `Input`, `Dialog`, `DropdownMenu`, `Select`, `Tabs` (also the segmented control), `Switch`, `Tooltip`, `CommandDialog` and `sonner` toasts.
- Don't hand-roll menus, popovers or modals.
- **Row anatomy (`features/board/Row.tsx`):**
  - favicon tile · title (once) · domain (once) + at most one quiet fact;
  - actions sit in their own grid column;
  - with a mouse they show on hover/focus; on touch they always show.
  - Never position menus absolutely inside a row.
- **Filters:** All / Open now / Saved, plus the shelf `Select` and search. Don't add chip rows. Category UI is parked until AI filters.

## Motion (one per kind; classes in `src/index.css`)
| Kind | Class | Feel |
|---|---|---|
| list rows (first paint only) | `.row-in` | 180 ms fade + 4 px rise |
| menus, selects | `.menu-motion` | 120 ms grow from the trigger, 2 px blur |
| dialogs | `.dialog-motion` / `.scrim-motion` | 240 ms rise 6 px from 98.5%; leave with a 120 ms fade |
| press | `.press` | 0.97 down in 120 ms, back with slight overshoot |
| Pip success | `.pip-hop` | a single 240 ms hop |

- Ease is `cubic-bezier(0.22, 1, 0.36, 1)`.
- Nothing loops at rest. The spinner only runs while syncing.
- `prefers-reduced-motion` keeps fades only.
- No motion library: CSS covers it.

## Responsive
- It works from 360 px to wide: one centred column, `max-w-3xl`.
- Settings becomes full-screen below `sm`.
- The header drops the ⌘ button and shortens the summary below `sm`.
- Check by screenshot at 400 px and 1400 px, light and dark.

## Accessibility
- Visible focus (`--focus` ring), a label on every icon button, tooltips on icon actions, dialogs titled.
- Rows are keyboard-reachable (`data-row`, j/k/arrows).
- Contrast: `ink-3` on `ground` is the floor for text; don't go lighter.
