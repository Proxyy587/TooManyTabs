import { useMemo } from "react"
import { cn } from "@/lib/utils"

/**
 * Tiny pixel art drawn from a text grid, in theme colours.
 *   K ink · B brand · S brand-soft · W panel · M muted ink · R raised · C currentColor · . empty
 * Each grid cell is one pixel; `scale` is how many screen pixels a cell takes, so art stays crisp.
 */
const FILL: Record<string, string> = {
  K: "var(--ink)",
  B: "var(--brand)",
  S: "var(--brand-soft)",
  W: "var(--float)",
  M: "var(--ink-3)",
  R: "var(--raised-2)",
  C: "currentColor",
}

export const SPRITES = {
  /** a browser window */
  window: ["KKKKKKKK", "KBBBBBBK", "KKKKKKKK", "KSSSSSSK", "KSSSSSSK", "KSSSSSSK", "KKKKKKKK"],
  /** a stack of trays: a shelf */
  stack: ["KKKKKKKK", "KBBBBBBK", "KKKKKKKK", "KSSSSSSK", "KKKKKKKK", "KBBBBBBK", "KKKKKKKK"],
  /** a crescent: the Later shelf */
  moon: ["..KKKK..", ".KSSK...", "KSSK....", "KSK.....", "KSK.....", "KSSK....", ".KSSKKK.", "..KKKKK."],
  star: ["...K...", "..KBK..", "KKKBKKK", "KBBBBBK", "KKKBKKK", "..KBK..", "...K..."],
  spark: ["..B..", "..B..", "BBBBB", "..B..", "..B.."],
  heart: [".KK.KK.", "KBBKBBK", "KBBBBBK", ".KBBBK.", "..KBK..", "...K..."],
  cloud: ["...KKK.....", "..KSSSK.KK.", ".KSSSSKKSSK", "KSSSSSSSSSK", ".KKKKKKKKK."],
  /** two overlapping tabs: duplicates */
  twins: ["KKKKK...", "KSSSK...", "KSKKKKK.", "KSKBBBK.", "KKKKBBK.", "..KBBBK.", "..KKKKK."],
  /** a sleepy z */
  zzz: ["KKKK", "..K.", ".K..", "KKKK"],
  /** a magnifier */
  search: [".KKK..", "K...K.", "K...K.", "K...K.", ".KKK..", "....KK", ".....K"],
  /** one-colour nav icons: they take the text colour of whatever holds them */
  navAll: ["CCC.CCC", "C.C.C.C", "CCC.CCC", ".......", "CCC.CCC", "C.C.C.C", "CCC.CCC"],
  navOpen: ["CCCCCCC", "C.....C", "CCCCCCC", "C.....C", "C.....C", "C.....C", "CCCCCCC"],
  navStack: ["CCCCCCC", "C.....C", "CCCCCCC", "C.....C", "CCCCCCC", "C.....C", "CCCCCCC"],
  navMoon: ["..CCC..", ".CC....", "CC.....", "C......", "CC.....", ".CC..CC", "..CCCC."],
  navPin: ["..CCC..", "..C.C..", "..CCC..", ".CCCCC.", "...C...", "...C...", "...C..."],
  navCmd: ["CC...CC", "C.C.C.C", "CC...CC", ".CCCCC.", "CC...CC", "C.C.C.C", "CC...CC"],
  navSpark: ["..C..", "..C..", "CCCCC", "..C..", "..C.."],
  navHeart: [".CC.CC.", "CCCCCCC", "CCCCCCC", ".CCCCC.", "..CCC..", "...C..."],
  navGear: ["..C.C..", ".CCCCC.", "CCC.CCC", ".C...C.", "CCC.CCC", ".CCCCC.", "..C.C.."],
  /** a pixel check */
  check: ["......K", ".....KK", "K...KK.", "KK.KK..", ".KKK...", "..K...."],
} as const

export type SpriteName = keyof typeof SPRITES

export function Sprite({ name, scale = 2, className, title }: { name: SpriteName; scale?: number; className?: string; title?: string }) {
  const grid = SPRITES[name]
  const rects = useMemo(() => {
    const out: { x: number; y: number; w: number; fill: string }[] = []
    grid.forEach((row, y) => {
      let x = 0
      while (x < row.length) {
        const ch = row[x]
        let w = 1
        while (row[x + w] === ch) w++
        if (ch !== "." && FILL[ch]) out.push({ x, y, w, fill: FILL[ch] })
        x += w
      }
    })
    return out
  }, [grid])
  const cols = grid[0].length
  return (
    <svg
      viewBox={`0 0 ${cols} ${grid.length}`}
      width={cols * scale}
      height={grid.length * scale}
      shapeRendering="crispEdges"
      className={cn("pixelated shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  )
}

/**
 * Pip's world: a pixel landscape that sits under the sidebar. 48 × 14 cells, so at the sidebar's
 * width of 288px every cell is exactly 6px. It uses theme colours only, so every palette gets its own sky.
 */
const SCENE_W = 48
const SCENE_H = 14

function sceneRects() {
  const out: { x: number; y: number; w: number; h: number; fill: string }[] = []
  const col = (x: number, top: number, fill: string) => out.push({ x, y: top, w: 1, h: SCENE_H - top, fill })
  // far hills
  for (let x = 0; x < SCENE_W; x++) col(x, 7 + Math.round(2 * Math.sin(x / 5.2) + Math.sin(x / 2.3 + 1)), "var(--raised-2)")
  // near hills
  for (let x = 0; x < SCENE_W; x++) col(x, 10 + Math.round(1.5 * Math.sin(x / 3.6 + 2)), "var(--brand-soft)")
  // ground
  out.push({ x: 0, y: 13, w: SCENE_W, h: 1, fill: "var(--brand)" })
  // stars
  for (const [x, y] of [[6, 2], [14, 5], [24, 1], [29, 4], [44, 6], [3, 6]] as const) out.push({ x, y, w: 1, h: 1, fill: "var(--ink-3)" })
  // a little cloud
  for (const [x, y, w] of [[18, 3, 5], [17, 4, 7]] as const) out.push({ x, y, w, h: 1, fill: "var(--float)" })
  // tiny pines, in ink-3 so they sit back
  for (const x of [9, 27, 41]) {
    for (const [dy, w] of [[7, 1], [8, 3], [9, 5], [10, 3], [11, 5]] as const) {
      out.push({ x: x - Math.floor(w / 2), y: dy + 1, w, h: 1, fill: "var(--tree)" })
    }
    out.push({ x, y: 13, w: 1, h: 1, fill: "var(--ink)" })
  }
  return out
}
const SCENE = sceneRects()
const SUN = [[36, 1, 4], [35, 2, 6], [35, 3, 6], [36, 4, 4]] as const

/** The scene at a fixed 6px per cell, mirrored end to end so it can run as wide as its container. */
export function SceneStrip({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none flex justify-center overflow-hidden", className)} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <Scene key={i} sun={i === 2} className={cn("w-72 max-w-none shrink-0", i % 2 ? "-scale-x-100" : "")} />
      ))}
    </div>
  )
}

export function Scene({ className, sun = true }: { className?: string; sun?: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      className={cn("pixelated block w-full", className)}
      aria-hidden
    >
      {sun ? SUN.map(([x, y, w]) => <rect key={y} x={x} y={y} width={w} height={1} fill="var(--brand)" />) : null}
      {SCENE.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
      ))}
    </svg>
  )
}
