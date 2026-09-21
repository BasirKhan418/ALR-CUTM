import { cn } from "@/lib/utils"

export function PageEnter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("animate-enter min-w-0", className)}>{children}</div>
}
