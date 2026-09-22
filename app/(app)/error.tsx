"use client"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4 pt-6">
      <h1 className="font-heading text-2xl font-bold">Something went wrong</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        This page could not finish loading. Try again, or return to your workspace.
        {error.digest ? ` Reference ${error.digest}.` : ""}
      </p>
      <button type="button" className={cn(buttonVariants(), "h-9")} onClick={() => reset()}>
        Try again
      </button>
    </div>
  )
}
