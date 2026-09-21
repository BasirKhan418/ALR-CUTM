import Link from "next/link"
import { cacheLife } from "next/cache"
import { ArrowRightIcon } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function HomePage() {
  "use cache"
  cacheLife("hours")

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4 md:px-10">
        <BrandMark preload />
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Sign in
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16 md:px-10">
        <div className="animate-enter max-w-xl">
          <p className="eyebrow">Centurion University</p>
          <h1 className="mt-4 font-heading text-4xl font-semibold text-foreground md:text-5xl">
            ALR — Learning Record
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground md:text-lg">
            Classroom, workshop, and capstone work — signed on campus, scored
            in the open, credited after committee.
          </p>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-8 h-10 inline-flex [&_svg]:transition-transform [&_svg]:duration-150 hover:[&_svg]:translate-x-0.5"
            )}
          >
            Sign in
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
      </main>
      <footer className="animate-enter-late border-t">
        <dl className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-6 text-sm md:grid-cols-3 md:px-10">
          <div className="flex flex-col gap-1">
            <dt className="eyebrow">Sign-in</dt>
            <dd className="font-medium">Campus email + OTP</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="eyebrow">Google</dt>
            <dd className="font-medium">Provisioned accounts only</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="eyebrow">First visit</dt>
            <dd className="font-medium">One-time declaration</dd>
          </div>
        </dl>
      </footer>
    </div>
  )
}
