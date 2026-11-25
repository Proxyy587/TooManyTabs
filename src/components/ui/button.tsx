import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "press pix-s inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap outline-none disabled:pointer-events-none disabled:[--pc:var(--raised-2)] disabled:[--btn-edge:transparent] disabled:text-ink-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // the one primary action: an ink block with a brand-coloured lip
        default:
          "pix-btn [--pc:var(--ink)] [--btn-edge:var(--brand)] text-primary-foreground hover:[--pc:color-mix(in_oklab,var(--ink)_82%,var(--ground))]",
        destructive:
          "pix-btn [--pc:var(--danger)] [--btn-edge:color-mix(in_oklab,var(--danger)_62%,black)] text-white hover:[--pc:color-mix(in_oklab,var(--danger)_88%,black)]",
        // secondary: a tonal block
        secondary:
          "pix-btn [--pc:var(--raised-2)] [--btn-edge:var(--edge)] text-ink hover:[--pc:color-mix(in_oklab,var(--raised-2)_86%,var(--ink))]",
        outline:
          "pix-btn [--pc:var(--raised-2)] [--btn-edge:var(--edge)] text-ink hover:[--pc:color-mix(in_oklab,var(--raised-2)_86%,var(--ink))]",
        // flat icon / text buttons: a tint on hover, no lip
        ghost: "pix-flat [--pc:transparent] text-ink-2 hover:[--pc:color-mix(in_oklab,var(--ink)_10%,transparent)] hover:text-ink",
        // the brand-colour block, only for a single "yes!" such as sign-in
        brand:
          "pix-btn [--pc:var(--brand)] [--btn-edge:color-mix(in_oklab,var(--brand)_55%,var(--ink))] text-on-brand hover:[--pc:color-mix(in_oklab,var(--brand)_88%,var(--ink))]",
        link: "pix-flat [--pc:transparent] text-link underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 has-[>svg]:px-3.5",
        xs: "h-7 gap-1 px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 px-6 text-base has-[>svg]:px-5",
        icon: "size-9",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
