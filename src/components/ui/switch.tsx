import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

/** A pixel switch: a square thumb that steps across the track like a sprite. */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer pix-s inline-flex h-6 w-11 shrink-0 cursor-pointer items-center p-1 outline-none",
        "data-[state=checked]:[--pc:var(--brand)] data-[state=unchecked]:[--pc:var(--track)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="step-slide pointer-events-none block size-4 bg-ink data-[state=checked]:translate-x-5 data-[state=checked]:bg-on-brand data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
