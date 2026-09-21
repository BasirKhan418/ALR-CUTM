import { Suspense } from "react"
import Link from "next/link"
import { BrandMark } from "@/components/brand-mark"
import { LoginForm } from "@/components/login-form"
import { LoginSkeleton } from "@/components/app-shell-skeleton"
import { isGoogleConfigured } from "@/lib/config/env"

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col p-4 sm:p-6 md:p-10">
        <Link
          href="/"
          className="w-fit transition-opacity hover:opacity-80"
        >
          <BrandMark preload />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[22rem]">
            <Suspense fallback={<LoginSkeleton />}>
              <LoginIsland searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          No passwords. Admin provisions the email first.
        </p>
      </div>
      <div className="campus-panel relative hidden overflow-hidden text-primary-foreground lg:block">
        <div className="absolute -top-16 -right-10 opacity-[0.12]">
          <BrandMark showWordmark={false} size="lg" variant="lockup" />
        </div>
        <div className="absolute top-10 left-10 rounded-xl bg-white p-3 shadow-sm">
          <BrandMark showWordmark={false} size="lg" variant="lockup" />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end gap-5 p-12">
          <div className="h-px w-12 bg-primary-foreground/35" />
          <p className="text-xs font-medium tracking-[0.08em] text-primary-foreground/70 uppercase">
            Centurion University
          </p>
          <h2 className="max-w-md font-heading text-3xl font-bold lg:text-4xl">
            The official Learning Record
          </h2>
          <p className="max-w-md text-sm leading-6 text-primary-foreground/75">
            Classroom, workshop, and capstone work — signed on campus, scored
            in the open, credited after committee.
          </p>
        </div>
      </div>
    </div>
  )
}

async function LoginIsland({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <LoginForm googleConfigured={isGoogleConfigured()} error={error} />
  )
}
