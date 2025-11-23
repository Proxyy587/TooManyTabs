import { Button } from "@/components/ui/button"

interface FooterProps {
  onFeedbackClick: () => void
  textColor?: string
  accentColor?: string
}

export function Footer({ onFeedbackClick, textColor, accentColor }: FooterProps) {
  return (
    <footer 
      className="text-center pt-8 border-t"
      style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
    >
      <p 
        className="text-sm mb-4 opacity-60"
        style={{ color: textColor || 'var(--theme-text)' }}
      >
        Made with ❤️ by{" "}
        <a
          href="https://discord.com/users/726293592376606770"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-100 transition-colors"
          style={{ color: accentColor || textColor || 'var(--theme-accent)' }}
        > Proxy</a> 
        
        &{" "}
        
        <a
        href="https://discord.com/users/853525881032933376"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-100 transition-colors"
        style={{ color: accentColor || textColor || 'var(--theme-accent)' }}
      >
        Cyber
      </a>
      </p>
      <Button
        variant="link"
        onClick={onFeedbackClick}
        className="transition-colors"
        style={{ color: accentColor || textColor || 'var(--theme-accent)' }}
      >
        Send Feedback
      </Button>
    </footer>
  )
}
