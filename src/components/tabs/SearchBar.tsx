import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = "Search tabs by title or URL..." }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none z-10" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-12 pr-4 h-12 bg-zinc-800 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 transition-all"
      />
    </div>
  )
}
