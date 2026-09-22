import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { YearQueueTable } from "@/components/year-tables"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { listCommitteeWork } from "@/lib/tiers/queries"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { yearStatusLabel } from "@/lib/domain/tiers"
import { Suspense } from "react"

export default function CommitteePage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "COMMITTEE_MEMBER")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const work = await listCommitteeWork(session.userId)
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Committee"
        description="Score the five-criterion rubric on year and programme evaluations you were assigned to."
      />
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Year evaluations</h2>
        <YearQueueTable rows={work.years} empty="No year evaluations are assigned to you." />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Programme evaluations</h2>
        {work.programs.length === 0 ? (
          <p className="rounded-xl bg-card px-4 py-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
            No programme evaluations are assigned to you.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Cumulated</th>
                  <th className="px-3 py-2 font-medium">Final</th>
                </tr>
              </thead>
              <tbody>
                {work.programs.map((row) => (
                  <tr key={row.id} className="border-t border-border/70">
                    <td className="px-3 py-2">
                      <Link href={row.href} className="font-medium hover:underline">
                        {row.studentName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{yearStatusLabel(row.status)}</Badge>
                    </td>
                    <td className="px-3 py-2">{row.cumulatedMark ?? "—"}</td>
                    <td className="px-3 py-2">{row.finalMark ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageEnter>
  )
}
