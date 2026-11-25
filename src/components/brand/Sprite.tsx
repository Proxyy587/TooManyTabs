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
