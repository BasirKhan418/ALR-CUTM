import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function AppNotFound() {
  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4 pt-6">
      <h1 className="font-heading text-2xl font-bold">Page not found</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        That address is not part of this workspace.
      </p>
      <Link href="/" className={cn(buttonVariants(), "h-9 inline-flex")}>
        Go home
      </Link>
    </div>
  )
}
