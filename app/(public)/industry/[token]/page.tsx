import { connection } from "next/server"
import { Suspense } from "react"
import { BrandMark } from "@/components/brand-mark"
import { IndustryForm } from "@/components/industry-form"
import { lookupIndustryToken } from "@/lib/actions/industry"

export default function IndustryTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6">
      <BrandMark preload />
      <Suspense
        fallback={
          <section className="rounded-xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
            Checking this industry link…
          </section>
        }
      >
        <IndustryTokenBody params={params} />
      </Suspense>
    </div>
  )
}

async function IndustryTokenBody({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  await connection()
  const { token } = await params
  const found = await lookupIndustryToken(token)

  if (found.status !== "ok") {
    return (
      <section className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <h1 className="font-heading text-2xl font-bold">
          {found.status === "expired" ? "This link has expired" : "This link is not valid"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask the university supervisor to issue a new 14-day industry token.
          Industry supervisors do not sign in to ALR.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <p className="eyebrow">Centurion University · Industry supervisor</p>
      <h1 className="mt-2 font-heading text-2xl font-bold">{found.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Candidates: {found.students.join(", ")}
        {found.org ? ` · ${found.org}` : ""}
      </p>
      <div className="mt-6">
        <IndustryForm
          token={token}
          attendance={found.attendance}
          stipend={found.stipend}
          taskCompletion={found.taskCompletion}
          feedback={found.feedback}
          externalScore={found.externalScore}
          alreadySaved={found.alreadySaved}
        />
      </div>
    </section>
  )
}
