import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"

async function boot() {
  // Outside the extension (npm run dev / preview) there is no chrome.storage:
  // load the mock so the page renders with sample data.
  const g = globalThis as unknown as { chrome?: { storage?: { local?: unknown } } }
  if (!g.chrome?.storage?.local) await import("./dev/chromeMock")
  const { default: App } = await import("./App")
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

boot()
