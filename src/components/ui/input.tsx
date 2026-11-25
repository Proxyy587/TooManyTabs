import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl bg-raised px-3.5 text-[15px] text-ink outline-none transition-[background-color,box-shadow] duration-150 placeholder:text-ink-3",
        "hover:bg-raised-2 focus-visible:bg-sunk focus-visible:shadow-[inset_0_0_0_1.5px_var(--focus)] focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-60 [&::-webkit-search-cancel-button]:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Input }
