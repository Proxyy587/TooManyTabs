import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"

interface CurrentTabsCardProps {
  tabCount: number
  isLoading: boolean
  onSave: () => void
}

export function CurrentTabsCard({ tabCount, isLoading, onSave }: CurrentTabsCardProps) {
  if (tabCount === 0) return null

  return (
    <Card className="border-zinc-800 bg-zinc-900 overflow-hidden">
      <CardHeader className="">
        <div className="flex flex-col">
          <CardTitle className="text-lg font-semibold text-white">
            {tabCount} tab{tabCount !== 1 ? "s" : ""} open
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Save them to free up memory and declutter
          </CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="pt-0 pb-6 px-6">
        <Button
          onClick={onSave}
          disabled={isLoading}
          className="bg-zinc-800 hover:bg-zinc-700 text-white transition-all p-[25px]"
        >
          <Save className="w-4 h-4 mr-2" />
      {isLoading ? "Saving..." : "Save Session"}
    </Button>
  </CardFooter>
</Card>
);
}
