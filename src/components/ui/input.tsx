import * as React from "react"
import { cn } from "@/lib/utils"

/** A tonal field with pixel corners. Focus lifts it to a lighter tone and adds the focus outline. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "pix-s [--pc:var(--raised)] h-10 w-full min-w-0 px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-3",
        "hover:[--pc:var(--raised-2)] focus-visible:[--pc:var(--float)] focus-visible:outline-2 focus-visible:outline-offset-[4px] focus-visible:outline-[var(--focus)]",
        "disabled:pointer-events-none disabled:opacity-60 [&::-webkit-search-cancel-button]:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Input }
