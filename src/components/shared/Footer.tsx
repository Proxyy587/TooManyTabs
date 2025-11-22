import { Button } from "@/components/ui/button"

interface FooterProps {
  onFeedbackClick: () => void
}

export function Footer({ onFeedbackClick }: FooterProps) {
  return (
    <footer className="text-center pt-8 border-t border-zinc-800">
      <p className="text-zinc-500 text-sm mb-4">
        Made with ❤️ by{" "}
        <a
          href="https://discord.com/users/726293592376606770"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-300 hover:text-white transition-colors"
        > Proxy</a> 
        
        &{" "}
        
        <a
        href="https://discord.com/users/853525881032933376"
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-300 hover:text-white transition-colors"
      >
        Cyber
      </a>
      </p>
      <Button
        variant="link"
        onClick={onFeedbackClick}
        className="text-zinc-400 hover:text-white transition-colors"
      >
        Send Feedback
      </Button>
    </footer>
  )
}
