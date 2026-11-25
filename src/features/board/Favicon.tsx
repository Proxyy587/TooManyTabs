import { useState } from "react"
import { faviconFor } from "@/lib/browser"

const TILE_HUES = [212, 32, 152, 268, 352, 190, 48, 120]

function hueFor(host: string) {
  let h = 0
  for (const c of host) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TILE_HUES[h % TILE_HUES.length]
}

/** Site icon from the browser's favicon cache, or a calm letter tile. */
export function Favicon({ url, host, fallbackSrc, small }: { url: string; host: string; fallbackSrc?: string | null; small?: boolean }) {
  const sources = [faviconFor(url), fallbackSrc && /^https?:|^data:/.test(fallbackSrc) ? fallbackSrc : null].filter(
    (s): s is string => !!s
  )
  const [failed, setFailed] = useState(0)
  const src = sources[failed]
  const letter = (host.replace(/^www\./, "")[0] || "•").toUpperCase()
  return (
    <span className={`pix-s [--pc:var(--ground)] grid shrink-0 place-items-center ${small ? "size-5" : "size-7"}`} aria-hidden>
      {src ? (
        <img src={src} alt="" width={16} height={16} className="size-4" onError={() => setFailed((n) => n + 1)} />
      ) : (
        <span
          className={`grid place-items-center font-display text-[11px] font-bold text-white ${small ? "size-4" : "size-5"}`}
          style={{ background: `oklch(0.62 0.13 ${hueFor(host)})` }}
        >
          {letter}
        </span>
      )}
    </span>
  )
}
