# TooManyTabs — Design System

## World

“Digital Creation of Adam” — pixel/dither fingertips meeting a dashed isometric cube. Rubik-inspired royal blue field, dotted grid, hard edges. Cartoonish vexel energy without clutter.

## Tokens

| Role | Light | Dark |
|------|-------|------|
| Field / paper | `#EEF2FF` | `#0B1B4A` |
| Surface | `#FFFFFF` | `#122456` |
| Ink | `#0A0F1C` | `#F4F6FF` |
| Muted | `#5B6478` | `#9AA6C2` |
| Line | `rgba(27,77,255,0.18)` | `rgba(255,255,255,0.14)` |
| Primary (blue) | `#1B4DFF` | `#5B7CFF` |
| Accent CTA | `#FF4D3A` | `#FF6B57` |
| OK | `#1F9D7A` | `#34D399` |
| Danger | `#E11D48` | `#FB7185` |
| Radius | 4px max (“pixel”) | same |
| Border | 1px hard | same |

## Typography

- **Display / brand:** Geist Pixel Square (or Pixelify Sans fallback) — brand wordmark + section titles only
- **Body / UI:** Geist Sans (or system-ui / Manrope fallback) — all controls and lists
- Never set long body copy in pixel font

## Signature elements

1. Dotted-grid background wash on the app shell
2. Dashed isometric cube mark beside **TooManyTabs**
3. Hot coral only on primary Park CTA
4. Footer credits bottom-right: `by Abhijit`

## Layout

```
┌─────────────────────────────────────────────┐
│ Brand  Search…………  Sync  Park  Settings   │  chrome ~20%
│ [Later] [All] [pinned…] [shelves…]          │
├─────────────────────────────────────────────┤
│ Onboarding tip (dismissible)                │
│ Tab rows / grid  (~80%)                     │
│                                             │
│                              by Abhijit     │  credits
└─────────────────────────────────────────────┘
```

Settings replaces the main pane (`view: shelf | settings`), same chrome brand row with Back.

## Motion (only 3)

1. Row hover: 1px translateY nudge
2. Park button: scale 0.98 on press
3. Empty-state cube: gentle idle opacity pulse (respect `prefers-reduced-motion`)

## Avoid

Purple-indigo SaaS gradients, cream+serif terracotta, newspaper columns, pill clusters, soft multi-layer shadows, card-stacked dashboards.
