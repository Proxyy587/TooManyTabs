import { forwardRef } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  backgroundColor?: string
  textColor?: string
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      value,
      onChange,
      placeholder = "Search groups & tabs…",
      backgroundColor,
      textColor,
    },
    ref
  ) {
    const fg = textColor || "var(--theme-text)"
    return (
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 pointer-events-none opacity-50"
          style={{ color: fg }}
        />
        <Input
          ref={ref}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 rounded-2xl border pl-11 pr-16 transition-all"
          style={{
            backgroundColor: backgroundColor || "rgba(255, 255, 255, 0.04)",
            color: fg,
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
          aria-label="Search saved tabs"
        />
        <kbd
          className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border px-1.5 py-0.5 text-[10px] opacity-45 sm:inline"
          style={{ color: fg, borderColor: "rgba(255,255,255,0.15)" }}
        >
          ⌘K
        </kbd>
      </div>
    )
  }
)
