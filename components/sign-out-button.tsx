"use client"

import { LogOutIcon } from "lucide-react"
import { signOut } from "@/lib/actions/auth"
import { SubmitButton } from "@/components/submit-button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function SignOutDialog() {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Sign out of ALR?</AlertDialogTitle>
        <AlertDialogDescription>
          This ends your session on this device. You will need a one-time code
          or Google to sign in again.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <form action={signOut}>
          <SubmitButton pendingLabel="Signing out…">
            <LogOutIcon data-icon="inline-start" />
            Sign out
          </SubmitButton>
        </form>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

export function SignOutButton({
  className,
  collapsedLabel = false,
}: {
  className?: string
  collapsedLabel?: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-8 w-full justify-start text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <LogOutIcon />
        <span className={collapsedLabel ? "group-data-[collapsible=icon]:hidden" : undefined}>
          Sign out
        </span>
      </AlertDialogTrigger>
      <SignOutDialog />
    </AlertDialog>
  )
}

export function SignOutMenu({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AlertDialog>
      {children}
      <SignOutDialog />
    </AlertDialog>
  )
}

export function SignOutMenuItem({
  className,
}: {
  className?: string
}) {
  return (
    <AlertDialogTrigger
      className={cn(
        "flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-muted-foreground outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
    >
      <LogOutIcon className="size-4" />
      Sign out
    </AlertDialogTrigger>
  )
}
