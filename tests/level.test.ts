import { describe, expect, it } from "vitest"
import { LEVEL_CELLS, tabLevel } from "../src/lib/level"

describe("tabLevel", () => {
  it("is calm and empty with no tabs", () => {
    expect(tabLevel(0)).toEqual({ label: "all clear", cells: 0 })
  })
  it("always fills at least one cell when something is open", () => {
    expect(tabLevel(1).cells).toBe(1)
  })
  it("names the bands", () => {
    expect([3, 10, 20, 31, 90].map((n) => tabLevel(n).label)).toEqual(["calm", "cozy", "busy", "too many", "way too many"])
  })
  it("never overflows the meter", () => {
    expect(tabLevel(500).cells).toBe(LEVEL_CELLS)
  })
})
