import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  backgroundColor?: string
  textColor?: string
}

export function SearchBar({ value, onChange, placeholder = "Search tabs by title or URL...", backgroundColor, textColor }: SearchBarProps) {
  return (
    <div className="relative">
      <Search 
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none z-10 opacity-60" 
        style={{ color: textColor || 'var(--theme-text)' }}
      />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-12 pr-4 h-12 transition-all"
        style={{
          backgroundColor: backgroundColor || 'rgba(255, 255, 255, 0.05)',
          color: textColor || 'var(--theme-text)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}
      />
    </div>
  )
}
