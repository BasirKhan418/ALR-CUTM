import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { BASKET_LABEL, exportStatusLabel } from "@/lib/domain/tiers"
import { firstShellHref } from "@/lib/domain/roles"
import { loadStudentCredits } from "@/lib/tiers/queries"
import { formatWhen } from "@/lib/ui/format"
import { Suspense } from "react"

export default function StudentCreditsPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "STUDENT")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const credits = await loadStudentCredits(session.userId)
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Credits"
        description={`${credits.basket}. ALR posts 1 credit for each signed academic year, in addition to ${credits.programmeName} credits.`}
      />
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <p className="eyebrow">{BASKET_LABEL}</p>
        <p className="mt-2 font-heading text-3xl font-bold">{credits.label}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {credits.expected
            ? `${credits.posted} posted of ${credits.expected} expected ALR credits.`
            : `${credits.posted} posted. Programme duration is not set.`}
        </p>
      </section>
      {credits.rows.length === 0 ? (
        <p className="rounded-xl bg-card px-4 py-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No ALR credits have been posted yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Academic year</th>
                <th className="px-3 py-2 font-medium">Credits</th>
                <th className="px-3 py-2 font-medium">Basket</th>
                <th className="px-3 py-2 font-medium">Posted</th>
                <th className="px-3 py-2 font-medium">Exam cell</th>
              </tr>
            </thead>
            <tbody>
              {credits.rows.map((row) => (
                <tr key={row.academicYear} className="border-t border-border/70">
                  <td className="px-3 py-2">{row.academicYear}</td>
                  <td className="px-3 py-2">{row.credits}</td>
                  <td className="px-3 py-2">{BASKET_LABEL}</td>
                  <td className="px-3 py-2">{formatWhen(row.postedAt)}</td>
                  <td className="px-3 py-2">{exportStatusLabel(row.exportStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageEnter>
  )
}
