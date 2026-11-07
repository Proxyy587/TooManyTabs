# Agent prompt — TooManyTabs 0.3 Shelf Revamp

Copy everything below the line into an implementation agent.

---

You are implementing the **TooManyTabs 0.3 Shelf Revamp** in `/Users/abhijit/Developer/Projects/TooManyTabs`.

## Required reading (do first)

1. `docs/PRODUCT.md`
2. `docs/DESIGN.md`
3. `docs/ARCHITECTURE.md`
4. Plan constraints: middle complexity; Later inbox; Park close-tabs **default false**; Settings page; credits `by Abhijit`

Treat DESIGN tokens as law. Do **not** expand beyond the MVP feature table in PRODUCT.md.

## Hard rules

1. Local-first guest mode always works; sync optional
2. Do **not** reinvent Web OAuth / localhost Google redirects — keep `chrome.identity.getAuthToken`
3. Geist Pixel (or Pixelify Sans fallback) for brand/titles only; body stays readable sans
4. No purple SaaS gradients, no pill soup, max 4px radius, hard 1px borders
5. Follow repo Vercel React best practices (no unnecessary memo; no waterfalls)
6. Bottom-right credits: `by Abhijit`
7. Prefer splitting `src/App.tsx` into `src/features/shelf` and `src/features/settings`
8. Ship buildable `dist/` via `bun run build`

## Phases

**A — Design system:** CSS tokens, dotted grid, cube mark, fonts, credits footer, `view: shelf | settings` shell  
**B — Core UX:** Later inbox, Park modal (partial select, close opt-in), SyncChip, move-to-shelf, onboarding, empty states  
**C — Settings:** Appearance, Behavior, Account/Sync, Export/Import, About  
**D — Cleanup:** remove or ignore orphans; update FEATURES.md; rebuild

## Definition of done

- [ ] Park to Later ≤2 clicks
- [ ] Settings reachable; close-on-park toggle works
- [ ] Visual identity matches DESIGN.md
- [ ] `bun run build` succeeds
- [ ] Credits visible bottom-right
