"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export function SubmitButton({
  children,
  pendingLabel = "Working…",
  className,
  variant = "default",
  size = "default",
}: {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      className={cn(pending && "pointer-events-none", className)}
    >
      {pending ? (
        <>
          <Spinner />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </Button>
  )
}
