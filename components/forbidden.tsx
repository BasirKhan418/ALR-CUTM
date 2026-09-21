import Link from "next/link"
import { ArrowLeftIcon, ShieldOffIcon } from "lucide-react"
import { PageEnter } from "@/components/page-enter"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Forbidden({ homeHref }: { homeHref: string }) {
  return (
    <PageEnter className="flex w-full max-w-lg flex-col items-start gap-5 pt-6">
      <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <ShieldOffIcon className="size-5" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          This workspace is closed
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Your account does not include this role. Open one of the workspaces
          listed in the sidebar.
        </p>
      </div>
      <Link
        href={homeHref}
        className={cn(buttonVariants(), "h-9 inline-flex")}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Go to your workspace
      </Link>
    </PageEnter>
  )
}
