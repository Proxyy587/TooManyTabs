import { Pip } from "@/components/brand/Pip"
import { Button } from "@/components/ui/button"
import type { SmartCategory } from "@/lib/items"
import { cn } from "@/lib/utils"

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pix [--pc:var(--panel)] pix-card mx-1 px-4 py-3.5" aria-label={title}>
      <h2 className="mb-2.5 font-display text-[15px] leading-none text-ink-2">{title}</h2>
      {children}
    </section>
  )
}

/**
 * The right-hand panel on wide screens: what needs attention (each with a
 * one-click fix) and where your tabs go (click a bar to filter by it).
 */
export function Insights({
  twins,
  kept,
  dusty,
  staleDays,
  onCloseTwins,
  onCloseKept,
  onSnooze,
  categories,
  selected,
  onCategory,
  tidy,
}: {
  twins: number
  kept: number
  dusty: number
  staleDays: number
  onCloseTwins: () => void
  onCloseKept: () => void
  onSnooze: () => void
  categories: SmartCategory[]
  selected: string[]
  onCategory: (id: string) => void
  tidy: boolean
}) {
  const todo = [
    twins > 0 && { key: "twins", text: `${twins} ${twins === 1 ? "tab is" : "tabs are"} open twice`, action: "Close extras", run: onCloseTwins },
    kept > 0 && { key: "kept", text: `${kept} already saved, safe to close`, action: "Close them", run: onCloseKept },
    dusty > 0 && { key: "dusty", text: `${dusty} untouched for ${staleDays}+ ${staleDays === 1 ? "day" : "days"}`, action: "Snooze", run: onSnooze },
  ].filter(Boolean) as { key: string; text: string; action: string; run: () => void }[]
  const shown = categories.filter((c) => c.total > 0).slice(0, 7)
  const max = Math.max(1, ...shown.map((c) => c.total))

  return (
    <div className="flex flex-col gap-6">
      <Card title="needs attention">
        {todo.length ? (
          <ul className="grid gap-3">
            {todo.map((t) => (
              <li key={t.key} className="grid gap-1.5">
                <p className="text-[13px] leading-snug text-ink">{t.text}</p>
                <Button size="xs" variant="secondary" className="w-fit" onClick={t.run}>
                  {t.action}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3">
            <Pip mood={tidy ? "happy" : "idle"} size={32} />
            <p className="text-[13px] text-ink-2">All tidy. Nothing to clean up.</p>
          </div>
        )}
      </Card>

      {shown.length ? (
        <Card title="where your tabs go">
          <ul className="grid gap-1">
            {shown.map((c) => {
              const on = selected.includes(c.id)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onCategory(c.id)}
                    className="press pix-s [--pc:transparent] grid w-full cursor-pointer gap-1 px-2 py-1.5 text-left outline-none hover:[--pc:var(--raised)]"
                  >
                    <span className="flex items-baseline justify-between gap-2 text-[13px]">
                      <span className={cn("truncate font-medium", on ? "text-ink" : "text-ink-2")}>{c.label}</span>
                      <span className="text-ink-3 tabular-nums">{c.total}</span>
                    </span>
                    <span className="block h-2 bg-raised-2" aria-hidden>
                      <span className={cn("block h-full", on ? "bg-ink" : "bg-brand")} style={{ width: `${Math.max(6, (c.total / max) * 100)}%` }} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      ) : null}

      <p className="px-3 text-[12px] leading-relaxed text-ink-3">
        <kbd className="font-display">/</kbd> search · <kbd className="font-display">⌘K</kbd> commands · <kbd className="font-display">s</kbd> save · <kbd className="font-display">?</kbd> all shortcuts
      </p>
    </div>
  )
}
