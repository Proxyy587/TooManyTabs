export function Onboarding({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="onboard mb-3 flex items-start justify-between gap-3">
      <p>
        <span className="font-display text-[11px]" style={{ color: "var(--blue)" }}>
          START HERE
        </span>
        <br />
        <strong>Park</strong> open tabs → <strong>Find</strong> with search →{" "}
        <strong>Restore</strong> when ready. Later is your default inbox.
      </p>
      <button type="button" className="btn-ghost !h-7 shrink-0 !text-[11px]" onClick={onDismiss}>
        Got it
      </button>
    </div>
  );
}
