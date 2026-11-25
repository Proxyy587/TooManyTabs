import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />
}

/** A tonal track; the selected segment is a lifted block with a brand lip. Scrolls sideways on narrow screens. */
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "pix-s [--pc:var(--raised)] inline-flex w-full max-w-full items-center gap-1.5 overflow-x-auto p-1.5 [scrollbar-width:none] sm:w-fit",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "press pix-s [--pc:transparent] inline-flex h-8 flex-1 shrink-0 cursor-pointer items-center justify-center gap-1.5 px-2.5 text-[13px] font-semibold whitespace-nowrap text-ink-2 outline-none sm:flex-none sm:px-3.5 sm:text-sm",
        "hover:text-ink data-[state=active]:[--pc:var(--seg-active)] data-[state=active]:text-ink",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
