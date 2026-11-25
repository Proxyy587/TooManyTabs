import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { PALETTES } from "../src/lib/palettes"
import { PALETTE_IDS } from "../src/lib/api"

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8")

/** Pull "--name: #hex" pairs out of the CSS rule whose selector contains `selector`. */
function rule(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`no rule for ${selector}`)
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start))
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]))
}

describe("palettes", () => {
  it("has a TS entry for every palette id", () => {
    expect(Object.keys(PALETTES).sort()).toEqual([...PALETTE_IDS].sort())
  })

  for (const id of PALETTE_IDS) {
    for (const mode of ["light", "dark"] as const) {
      it(`${id} ${mode} swatches match the CSS`, () => {
        const sel =
          id === "pip" && mode === "light"
            ? ":root"
            : `[data-theme="${mode}"][data-palette="${id}"]`
        const css = rule(sel)
        const sw = PALETTES[id][mode]
        expect(css["ground"]).toBe(sw.ground)
        expect(css["raised"]).toBe(sw.raised)
        expect(css["raised-2"]).toBe(sw.raised2)
        expect(css["ink"]).toBe(sw.ink)
        expect(css["brand"]).toBe(sw.brand)
        expect(css["on-brand"]).toBe(sw.onBrand)
      })
    }
  }
})
