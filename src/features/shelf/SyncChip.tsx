export type SyncState = "offline" | "syncing" | "synced" | "error";

export function SyncChip({
  state,
  title,
}: {
  state: SyncState;
  title?: string;
}) {
  const label =
    state === "offline"
      ? "This device"
      : state === "syncing"
        ? "Syncing"
        : state === "error"
          ? "Sync error"
          : "Synced";

  return (
    <span className="sync-chip" data-state={state} title={title || label}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 1,
          background: "currentColor",
        }}
      />
      {label}
    </span>
  );
}
