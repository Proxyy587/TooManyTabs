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
            "!rounded-full !border-0 !bg-primary !text-primary-foreground !shadow-[var(--shadow-float)] !py-2.5 !px-4 !font-sans !text-sm !gap-3 !w-auto !min-w-0 !max-w-[min(92vw,440px)] !left-1/2 !-translate-x-1/2",
          actionButton:
            "!rounded-full !bg-[color-mix(in_oklab,var(--primary-foreground)_18%,transparent)] !text-primary-foreground !font-semibold !h-7 !px-3",
          title: "!font-medium",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
