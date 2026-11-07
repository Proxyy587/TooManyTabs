export function CubeMark({
  className = "",
  idle = false,
}: {
  className?: string;
  idle?: boolean;
}) {
  return (
    <svg
      className={`${idle ? "cube-idle" : ""} ${className}`}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 3.5 L20 8 L20 16 L12 20.5 L4 16 L4 8 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.5 2"
      />
      <path d="M12 3.5 V12 M12 12 L20 8 M12 12 L4 8" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
      <circle cx="12" cy="3.5" r="1.1" fill="currentColor" />
      <circle cx="20" cy="8" r="1.1" fill="currentColor" />
      <circle cx="20" cy="16" r="1.1" fill="currentColor" />
      <circle cx="12" cy="20.5" r="1.1" fill="currentColor" />
      <circle cx="4" cy="16" r="1.1" fill="currentColor" />
      <circle cx="4" cy="8" r="1.1" fill="currentColor" />
    </svg>
  );
}
