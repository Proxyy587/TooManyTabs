import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Brand-styled toaster. The theme comes from our own [data-theme] switch. */
function Toaster({ theme, ...props }: ToasterProps & { theme: "light" | "dark" }) {
  return (
    <Sonner
      theme={theme}
      position="bottom-center"
      offset={20}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "pix-s pix-float [--pc:var(--ink)] !rounded-none !border-0 !bg-[var(--pc)] !text-primary-foreground ![box-shadow:-2px_0_0_0_var(--ink),2px_0_0_0_var(--ink),0_-2px_0_0_var(--ink),0_2px_0_0_var(--ink)] !py-2.5 !px-4 !font-sans !text-sm !gap-3 !w-auto !min-w-0 !max-w-[min(92vw,440px)] !left-1/2 !-translate-x-1/2",
          actionButton:
            "!rounded-none !bg-[var(--brand)] !text-[var(--on-brand)] !font-semibold !h-7 !px-3",
          title: "!font-medium",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
