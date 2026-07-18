import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { CheckCircle2, Info, AlertCircle, X } from "lucide-react"

type ToastKind = "success" | "info" | "error"

interface ToastItem {
  id: string
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = crypto.randomUUID()
    setItems((prev) => [...prev, { id, message, kind }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2800)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 left-1/2 z-[100] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2 pointer-events-none">
        {items.map((item) => {
          const Icon = item.kind === "success" ? CheckCircle2 : item.kind === "error" ? AlertCircle : Info
          const accent =
            item.kind === "success" ? "var(--mint)" : item.kind === "error" ? "var(--danger)" : "var(--pop)"
          return (
            <div
              key={item.id}
              className="pointer-events-auto rise flex items-start gap-3 rounded-2xl border px-4 py-3"
              style={{
                background: "var(--paper-2)",
                borderColor: "var(--line-2)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.1)",
                color: "var(--ink)",
              }}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
              <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
              <button
                type="button"
                className="opacity-40 hover:opacity-100"
                aria-label="Dismiss"
                onClick={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}
