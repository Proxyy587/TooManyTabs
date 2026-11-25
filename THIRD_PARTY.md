# Third-party notices

TooManyTabs bundles the following third-party assets. Licence texts ship next to the files.

## Fonts

| Font | Use | Licence | Source | Licence file |
|------|-----|---------|--------|--------------|
| Pixelify Sans (variable, latin subset) | Display: wordmark, headings, counts, Pip's speech | SIL Open Font License 1.1, no Reserved Font Name | Pixelify Sans Project Authors, https://github.com/eifetx/Pixelify-Sans, via `@fontsource-variable/pixelify-sans@5.3.0` | `public/fonts/licenses/PixelifySans-OFL.txt` |
| Atkinson Hyperlegible Next (variable, latin subset, roman + italic) | UI and body text | SIL Open Font License 1.1, no Reserved Font Name | Atkinson Hyperlegible Next Project Authors (Braille Institute), https://github.com/googlefonts/atkinson-hyperlegible-next, via `@fontsource-variable/atkinson-hyperlegible-next@5.3.0` | `public/fonts/licenses/AtkinsonHyperlegibleNext-OFL.txt` |

Both are redistributed unmodified (as published by Fontsource) inside the extension, which the OFL permits as long as the fonts are not sold on their own.

## Code (runtime dependencies)

All runtime npm dependencies are MIT licensed: React, React DOM, Radix UI primitives, lucide-react (ISC), class-variance-authority (Apache-2.0), clsx, tailwind-merge, Tailwind CSS. Run `npx license-checker --production --summary` to re-check.

## Artwork

Pip (the mascot), the category sprites and all icons are original pixel art made for this project (`src/brand/pip.json`, `src/components/brand/Sprite.tsx`). They are covered by the project's MIT licence.

## Inspiration (no code or assets used)

The one-page layout was inspired by the public website of dusk.bot (source-available, PolyForm Noncommercial). No code, CSS, copy or assets from it are used.
