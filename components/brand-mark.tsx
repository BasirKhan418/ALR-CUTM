import { GraduationCapIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function BrandMark({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <GraduationCapIcon className="size-3.5" />
      </span>
      {showWordmark ? (
        <span className="font-heading text-sm font-semibold tracking-tight">
          ALR
        </span>
      ) : null}
    </span>
  )
}
