---
name: dusk-feel
description: Make a TooManyTabs web surface feel like dusk bot (dusk.bot), the look the owner points to. Tonal, borderless pixel-notched surfaces, ink buttons with a coloured lip, one motion per kind, quiet copy, a little pixel world. Use with tmt-design when restyling or reviewing UI, or when the owner says "like dusk", "cleaner", "less slop" or "more premium".
---

# The dusk feel, for a web extension page
Adapted for the web from the owner's own `dusk-feel` skill in the Belay repo (MIT, ours). It describes a feel learned from dusk bot's public site.
- **Never copy dusk bot's code, CSS, copy or assets** (it's PolyForm Noncommercial).
- The numbers here are observations of a feel, not source.
- `tmt-design` decides what TooManyTabs is. This skill tunes how it feels.

## 1. Surfaces are tones, not boxes
- Separate things by shade, not lines. Surfaces step ground → panel → hover; the palette decides the actual colours (see `tmt-design`).
- **Tone, never a line.** Pixel notches replace borders and radii. A float gets a hard pixel shadow, never a blur. Inputs are tonal fields; focus adds an outline.
- Hard shadows only on things that float or sit on a lip (menus, dialogs, toasts, cards, buttons).
- Text has three levels: ink, about 66% and about 54%. Never invent a fourth.

## 2. Pills and one primary action
- **Primary:** a neutral ink block that inverts the surface, with a palette-coloured lip. Hover darkens slightly; the label never changes colour.
- **Disabled:** a tonal fill with faded text, not opacity on the whole button.
- **Secondary:** a tonal block.
- **Accent colour means "this one":** the selected nav item, a switch that's on, a meter cell, a chip. It's a fill with `on-brand` text, never text colour.
- **Segmented choice:** a tonal track whose selected segment is a lifted block.

## 3. Shape
- Corners are stair-stepped pixels (4 / 3 / 2px notches), not radii.
- Nested shapes use a smaller notch inside a bigger one, with padding at least as large as the outer notch.

## 4. Motion: exactly one per kind
| Kind | Feel |
|---|---|
| Durations | pick from 100 / 120 / 150 / 180 / 200 / 240 ms |
| Ease | quick ease-out `cubic-bezier(0.22, 1, 0.36, 1)` |
| Dialog in | rise 6 px from 98.5% scale and fade, 240 ms. The scrim fades in 160 ms. Leaving is a 120 ms fade only. |
| Menu / popover in | 120 ms grow from the trigger, with a touch of blur |
| Pane swap | new content rises a few px; no slide-ins from the side |
| Press | the face drops 2px in 100 ms and the lip squashes; no scaling |
| Switch thumb | steps across the track like a sprite (`steps(4)`), about 180 ms |

- Never animate width or height for layout.
- **Nothing loops at rest.** The one living thing is the mascot, and only when something happens.
- Reduced motion keeps only fades.
- Implement in CSS with Radix `data-state` attributes. Reach for a motion library only if CSS can't do it.

## 5. Type and words
- UI text is untracked and comes in three weights. Display text is the pixel face, used rarely.
- **Lowercase brand and pixel headings, sentence case everywhere else, very few words.** A label names; it doesn't explain.
- Copy is calm and concrete: "Saved 12 tabs to Later", not "Your tabs are safe and sound!".
- Personality comes from Pip, the sprites, the landscape and the tab-level meter. Rows, menus and dialogs stay plain.

## 6. Check yourself like dusk does
- Capture every surface in light and dark (and in a second palette), at about 400 px and about 1400 px:
  - the page with data, with a menu open, and empty;
  - the Save dialog, the command menu, and each Settings tab.
- For each finding, write what's wrong → the fix → its status, and keep the "after" screenshots.
- Fail any screenshot that shows:
  - a border *and* a shadow on one surface;
  - more than one ink primary button per view;
  - a blurred shadow, a gradient, or a `rounded-*` corner;
  - text repeated in a row;
  - overlapping controls;
  - anything looping at rest.
