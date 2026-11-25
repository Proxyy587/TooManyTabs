/** Number of cells in the sidebar's tab-level meter. */
export const LEVEL_CELLS = 16

/** How crowded the browser is, in Pip's words, and how many meter cells to fill. */
export function tabLevel(open: number): { label: string; cells: number } {
  const label = open <= 0 ? "all clear" : open <= 5 ? "calm" : open <= 12 ? "cozy" : open <= 25 ? "busy" : open <= 40 ? "too many" : "way too many"
  return { label, cells: open <= 0 ? 0 : Math.max(1, Math.min(LEVEL_CELLS, Math.ceil((open / 40) * LEVEL_CELLS))) }
}
