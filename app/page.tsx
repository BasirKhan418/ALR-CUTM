import Link from "next/link"
import { cacheLife } from "next/cache"
import { BrandMark } from "@/components/brand-mark"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function HomePage() {
  "use cache"
  cacheLife("hours")

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <BrandMark />
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Sign in
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 pb-24">
        <p className="text-sm font-medium text-muted-foreground">
          Centurion University of Technology and Management
        </p>
        <h1 className="font-heading text-4xl font-semibold text-foreground md:text-5xl">
          ALR — Learning Record
        </h1>
        <p className="max-w-lg text-lg leading-7 text-muted-foreground">
          A quiet workspace for classroom, practice, workshop, and capstone
          records — with committee evaluation and compulsory ALR credit.
        </p>
        <div>
          <Link href="/login" className={cn(buttonVariants(), "inline-flex")}>
            Continue to sign in
          </Link>
        </div>
      </main>
    </div>
  )
}
