import { useMemo } from "react"
import pip from "@/brand/pip.json"
import { cn } from "@/lib/utils"

export type PipMood = "idle" | "happy" | "sleepy" | "surprised"

type Patch = [row: number, col: number, key: string][]

// Face pixels live at rows 7–11 of the 16×16 grid (see src/brand/pip.json):
// eyes at (7–8, 4) and (7–8, 9), mouth at (10, 6–7).
const EYES_CLEAR: Patch = [[7, 4, "Y"], [8, 4, "Y"], [7, 9, "Y"], [8, 9, "Y"]]
const MOUTH_CLEAR: Patch = [[10, 6, "Y"], [10, 7, "Y"]]

const MOODS: Record<PipMood, Patch> = {
  idle: [],
  happy: [
    ...EYES_CLEAR, [7, 4, "K"], [8, 3, "K"], [8, 5, "K"], [7, 9, "K"], [8, 8, "K"], [8, 10, "K"],
    ...MOUTH_CLEAR, [10, 5, "K"], [11, 6, "K"], [11, 7, "K"], [10, 8, "K"],
  ],
  sleepy: [
    ...EYES_CLEAR, [8, 3, "K"], [8, 4, "K"], [8, 5, "K"], [8, 8, "K"], [8, 9, "K"], [8, 10, "K"],
    ...MOUTH_CLEAR, [10, 7, "K"],
  ],
  surprised: [[10, 6, "K"], [10, 7, "K"], [11, 6, "K"], [11, 7, "K"]],
}

function patched(mood: PipMood): string[] {
  const rows = pip.grid.map((r) => r.split(""))
  for (const [r, c, k] of MOODS[mood]) rows[r][c] = k
  return rows.map((r) => r.join(""))
}

/** Pip, the mascot, drawn on its real 16×16 pixel grid. */
export function Pip({
  mood = "idle",
  size = 32,
  className,
  title,
}: {
  mood?: PipMood
  size?: number
  className?: string
  title?: string
}) {
  const rects = useMemo(() => {
    const palette = pip.palette as Record<string, string>
    const out: { x: number; y: number; w: number; fill: string }[] = []
    patched(mood).forEach((row, y) => {
      let x = 0
      while (x < row.length) {
        const ch = row[x]
        let w = 1
        while (row[x + w] === ch) w++
        if (ch !== ".") out.push({ x, y, w, fill: palette[ch] })
        x += w
      }
    })
    return out
  }, [mood])

  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
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
