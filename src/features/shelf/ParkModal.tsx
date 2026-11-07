import { useEffect, useState } from "react"
import type { TabGroup } from "@/lib/api"
import { LATER_SHELF_ID } from "@/lib/api"

export type OpenTab = {
  id: string
  url: string
  title: string
  favIconUrl?: string
}

type Dest = "later" | "new" | string

export function ParkModal({
  openTabs,
  groups,
  closeOnPark,
  onCloseOnParkChange,
  onClose,
  onPark,
  onCloseDuplicates,
  onSortBySite,
  dupeCount = 0,
  busy,
}: {
  openTabs: OpenTab[]
  groups: TabGroup[]
  closeOnPark: boolean
  onCloseOnParkChange: (v: boolean) => void
  onClose: () => void
  onPark: (payload: {
    tabIds: string[]
    dest: Dest
    newName: string
  }) => Promise<void>
  onCloseDuplicates?: () => Promise<void>
  onSortBySite?: () => Promise<void>
  dupeCount?: number
  busy?: boolean
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(openTabs.map((t) => t.id)))
  const [dest, setDest] = useState<Dest>("later")
  const [newName, setNewName] = useState("")

  useEffect(() => {
    setSelected(new Set(openTabs.map((t) => t.id)))
  }, [openTabs])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = openTabs.length > 0 && selected.size === openTabs.length
  const shelves = groups.filter((g) => g.id !== LATER_SHELF_ID)

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="park-title"
      >
        <h2 id="park-title" className="font-display text-sm" style={{ color: "var(--ink)" }}>
          Park tabs
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
          Choose tabs and a shelf. Closing tabs is optional.
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-ghost !h-7 !text-[11px]"
            onClick={() => setSelected(new Set(openTabs.map((t) => t.id)))}
          >
            Select all
          </button>
          <button
            type="button"
            className="btn-ghost !h-7 !text-[11px]"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
          <span className="ml-auto self-center text-[11px]" style={{ color: "var(--ink-3)" }}>
            {selected.size}/{openTabs.length}
          </span>
        </div>

        <div className="mt-2 max-h-40 space-y-1 overflow-auto panel p-1.5">
          {openTabs.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-xs hover:bg-[var(--blue-soft)]"
            >
              <input
                type="checkbox"
                checked={selected.has(t.id)}
                onChange={() => toggle(t.id)}
              />
              {t.favIconUrl ? (
                <img src={t.favIconUrl} alt="" className="h-3.5 w-3.5" />
              ) : (
                <span className="h-3.5 w-3.5 bg-[var(--paper-3)]" />
              )}
              <span className="min-w-0 truncate">{t.title || t.url}</span>
            </label>
          ))}
          {openTabs.length === 0 && (
            <p className="px-2 py-3 text-center text-xs" style={{ color: "var(--ink-3)" }}>
              No open tabs to park
            </p>
          )}
        </div>

        <label className="mt-3 block text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
          Destination
        </label>
        <select
          className="mt-1 h-9 w-full rounded-sm border px-2 text-sm outline-none"
          style={{ borderColor: "var(--line)", background: "var(--paper)", color: "var(--ink)" }}
          value={dest}
          onChange={(e) => setDest(e.target.value)}
        >
          <option value="later">Later (inbox)</option>
          <option value="new">New shelf…</option>
          {shelves.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        {dest === "new" && (
          <input
            className="mt-2 h-9 w-full rounded-sm border px-2.5 text-sm outline-none"
            style={{ borderColor: "var(--line)", background: "var(--paper)", color: "var(--ink)" }}
            placeholder="Shelf name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
        )}

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
          <input
            type="checkbox"
            checked={closeOnPark}
            onChange={(e) => onCloseOnParkChange(e.target.checked)}
          />
          Close parked tabs after saving
        </label>

        {(onCloseDuplicates || onSortBySite) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dupeCount > 0 && onCloseDuplicates && (
              <button
                type="button"
                className="btn-ghost !h-7 !text-[11px]"
                disabled={busy}
                onClick={() => void onCloseDuplicates()}
              >
                Close {dupeCount} duplicate{dupeCount === 1 ? "" : "s"}
              </button>
            )}
            {onSortBySite && openTabs.length >= 2 && (
              <button
                type="button"
                className="btn-ghost !h-7 !text-[11px]"
                disabled={busy}
                onClick={() => void onSortBySite()}
              >
                Sort window by site
              </button>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-solid flex-1"
            disabled={busy || selected.size === 0 || (dest === "new" && !newName.trim())}
            onClick={() =>
              onPark({
                tabIds: [...selected],
                dest,
                newName: newName.trim(),
              })
            }
          >
            {busy ? "Parking…" : allSelected ? "Park tabs" : `Park ${selected.size}`}
          </button>
        </div>
      </div>
    </div>
  )
}
