---
name: dusk-feel
description: Make a TooManyTabs web surface feel like dusk bot (dusk.bot), the look the owner points to. Tonal, borderless surfaces, neutral pill buttons, one motion per kind, quiet copy, one pixel moment. Use with tmt-design when restyling or reviewing UI, or when the owner says "like dusk", "cleaner", "less slop" or "more premium".
---

# The dusk feel, for a web extension page
Adapted for the web from the owner's own `dusk-feel` skill in the Belay repo (MIT, ours). It describes a feel learned from dusk bot's public site.
- **Never copy dusk bot's code, CSS, copy or assets** (it's PolyForm Noncommercial).
- The numbers here are observations of a feel, not source.
- `tmt-design` decides what TooManyTabs is. This skill tunes how it feels.

## 1. Surfaces are tones, not boxes
- Separate things by shade, not lines or shadows. Light ground is near-white; raised surfaces are a few percent darker; hover is a few percent more.
- The dark ladder steps up in small increments, roughly `#131316` ground, `#1F1F23` raised, `#2A2A2F` hover.
- **Tone or line, never both.** A menu gets a tone and a soft float shadow, no border. Inputs are tonal fields; focus adds a ring.
- Shadows only on things that float (menus, dialogs, toasts).
- Text has three levels: ink, about 66% and about 54%. Never invent a fourth.

## 2. Pills and one primary action
- **Primary:** a neutral ink pill that inverts the surface (dark pill on light, light pill on dark). Hover darkens slightly; the label never changes colour.
- **Disabled:** a tonal fill with faded text, not opacity on the whole button.
- **Secondary:** a tonal pill.
- **Accent colour is state, not decoration:** focus, a switch that's on, the one selected thing.
- **Segmented choice:** a pill track whose selected segment is a raised pill.

## 3. Shape
- Radius ladder 6 / 8 / 12 / 14; buttons and chips are capsules.
- Nested shapes get rounder inside smaller: inner radius = outer radius − inset.

## 4. Motion: exactly one per kind
| Kind | Feel |
|---|---|
| Durations | pick from 100 / 120 / 150 / 180 / 200 / 240 ms |
| Ease | quick ease-out `cubic-bezier(0.22, 1, 0.36, 1)` |
| Dialog in | rise 6 px from 98.5% scale and fade, 240 ms. The scrim fades in 160 ms. Leaving is a 120 ms fade only. |
| Menu / popover in | 120 ms grow from the trigger, with a touch of blur |
| Pane swap | new content rises a few px; no slide-ins from the side |
| Press | scale 0.97 in 120 ms, back with a hair of overshoot `cubic-bezier(0.28, 1.4, 0.36, 1)` ≈ 200 ms |
| Switch thumb | spring with slight overshoot, settled by about 300 ms |

- Never animate width or height for layout.
- **Nothing loops at rest.** The one living thing is the mascot, and only when something happens.
- Reduced motion keeps only fades.
- Implement in CSS with Radix `data-state` attributes. Reach for a motion library only if CSS can't do it.

## 5. Type and words
- UI text is untracked and comes in three weights. Display text is the pixel face, used rarely.
- **Lowercase brand, sentence case everywhere else, very few words.** A label names; it doesn't explain.
- Copy is calm and concrete: "Saved 12 tabs to Later", not "Your tabs are safe and sound!".
- One pixel-art moment carries the personality (Pip). Everything else is plain.

## 6. Check yourself like dusk does
- Capture every surface in light and dark, at about 400 px and about 1400 px:
  - the page with data, with a menu open, and empty;
  - the Save dialog, the command menu, and each Settings tab.
- For each finding, write what's wrong → the fix → its status, and keep the "after" screenshots.
- Fail any screenshot that shows:
  - a border *and* a shadow on one surface;
  - more than one ink pill per view;
  - text repeated in a row;
  - overlapping controls;
  - anything looping at rest.
