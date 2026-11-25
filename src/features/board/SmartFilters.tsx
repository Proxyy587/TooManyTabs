import { Plus } from "lucide-react"
import { FLAGS, type Flag, type SmartCategory } from "@/lib/items"
import { cn } from "@/lib/utils"

function Chip({ on, dim, onClick, children, title }: { on: boolean; dim?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={cn(
        "press pix-s inline-flex h-7 cursor-pointer items-center gap-1.5 px-2.5 text-[13px] font-semibold whitespace-nowrap outline-none",
        on
          ? "[--pc:var(--brand)] text-on-brand"
          : "[--pc:var(--raised)] text-ink-2 hover:[--pc:var(--raised-2)] hover:text-ink",
        dim && !on && "opacity-50"
      )}
    >
      {children}
    </button>
  )
}

/**
 * Smart filters: what's wrong with a tab (twins, dusty, safe to close) and
 * what kind of page it is. Counts always reflect the other active filters.
 */
export function SmartFilters({
  flagCounts,
  flagTotals,
  flags,
  onFlag,
  categories,
  categoryCounts,
  selected,
  onCategory,
  onAdd,
  onClear,
}: {
  flagCounts: Record<string, number>
  /** counts with no filters on: decides which chips exist, so the row never jumps */
  flagTotals: Record<string, number>
  flags: Flag[]
  onFlag: (f: Flag) => void
  categories: SmartCategory[]
  categoryCounts: Record<string, number>
  selected: string[]
  onCategory: (id: string) => void
  onAdd: () => void
  onClear: () => void
}) {
  const shownFlags = FLAGS.filter((f) => (flagTotals[f.id] || 0) > 0 || flags.includes(f.id))
  const active = flags.length + selected.length
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Smart filters">
      {shownFlags.map((f) => (
        <Chip key={f.id} on={flags.includes(f.id)} dim={(flagCounts[f.id] || 0) === 0} onClick={() => onFlag(f.id)} title={f.hint}>
          {f.label} <span className="tabular-nums opacity-70">{flagCounts[f.id] || 0}</span>
        </Chip>
      ))}
      {shownFlags.length > 0 && categories.length > 0 ? <span aria-hidden className="mx-0.5 h-4 w-0.5 bg-[var(--line)]" /> : null}
      {categories.map((c) => {
        const n = categoryCounts[c.id] || 0
        return (
          <Chip key={c.id} on={selected.includes(c.id)} dim={n === 0} onClick={() => onCategory(c.id)} title={c.custom ? "Your category" : undefined}>
            {c.label} <span className="tabular-nums opacity-70">{n}</span>
          </Chip>
        )
      })}
      <button
        type="button"
        onClick={onAdd}
        aria-label="New category"
        title="Make your own category"
        className="press pix-s [--pc:transparent] inline-flex h-7 cursor-pointer items-center gap-1 px-2 text-[13px] font-semibold text-ink-3 outline-none hover:[--pc:var(--raised)] hover:text-ink"
      >
        <Plus className="size-3.5" /> Category
      </button>
      {active > 0 ? (
        <button type="button" onClick={onClear} className="cursor-pointer px-1.5 text-[13px] font-medium text-ink-3 underline-offset-4 outline-none hover:text-ink hover:underline">
          Clear
        </button>
      ) : null}
    </div>
  )
}
