import type { PaletteId } from "./api"

/** Raw colours of one palette in one mode. The CSS in src/index.css is the source; tests/palettes.test.ts keeps this in step. */
export type Swatch = { ground: string; raised: string; raised2: string; ink: string; brand: string; onBrand: string }

export const PALETTES: Record<PaletteId, { name: string; blurb: string; light: Swatch; dark: Swatch }> = {
  pip: {
    name: "Pip",
    blurb: "butter and cream",
    light: { ground: "#fbf6e8", raised: "#f2ead2", raised2: "#e8ddbb", ink: "#26213a", brand: "#ffc93c", onBrand: "#26213a" },
    dark: { ground: "#1b1824", raised: "#262232", raised2: "#322d41", ink: "#f7f1e1", brand: "#ffc93c", onBrand: "#26213a" },
  },
  dusk: {
    name: "Dusk",
    blurb: "twilight violet",
    light: { ground: "#f4effb", raised: "#e8dff6", raised2: "#dacfee", ink: "#2b2147", brand: "#9b7bff", onBrand: "#1e1438" },
    dark: { ground: "#16121f", raised: "#211b31", raised2: "#2d2543", ink: "#efeafb", brand: "#b79cff", onBrand: "#1e1438" },
  },
  mint: {
    name: "Mint",
    blurb: "fresh leaves",
    light: { ground: "#edf8f1", raised: "#dcefe3", raised2: "#c9e5d4", ink: "#15312a", brand: "#3dcb93", onBrand: "#0e2a20" },
    dark: { ground: "#0f1a16", raised: "#17251f", raised2: "#203329", ink: "#e3f6eb", brand: "#4fe0a8", onBrand: "#0e2a20" },
  },
  peach: {
    name: "Peach",
    blurb: "warm sunset",
    light: { ground: "#fff3ea", raised: "#fbe2d3", raised2: "#f5d0bc", ink: "#3b2019", brand: "#ff7f61", onBrand: "#35120b" },
    dark: { ground: "#1b1310", raised: "#281c18", raised2: "#362622", ink: "#fbeae1", brand: "#ff9478", onBrand: "#35120b" },
  },
  sky: {
    name: "Sky",
    blurb: "clear morning",
    light: { ground: "#ebf4fe", raised: "#d9e8fa", raised2: "#c6dcf5", ink: "#13284a", brand: "#5aa6ff", onBrand: "#0a1f40" },
    dark: { ground: "#0e1624", raised: "#162235", raised2: "#1f2e47", ink: "#e5eefc", brand: "#6fb1ff", onBrand: "#0a1f40" },
  },
  gum: {
    name: "Bubblegum",
    blurb: "sweet and loud",
    light: { ground: "#fff0f6", raised: "#fbdcea", raised2: "#f6c8dc", ink: "#3c1631", brand: "#ff72b4", onBrand: "#3a0e26" },
    dark: { ground: "#1c1119", raised: "#2a1a25", raised2: "#392433", ink: "#fce8f1", brand: "#ff8dc4", onBrand: "#3a0e26" },
  },
}
