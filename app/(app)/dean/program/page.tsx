import Link from "next/link"
import { ConstituteProgramForm } from "@/components/tier-forms"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { Badge } from "@/components/ui/badge"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { yearStatusLabel } from "@/lib/domain/tiers"
import { firstShellHref } from "@/lib/domain/roles"
import { listCommitteeMembers, loadProgramBoard } from "@/lib/tiers/queries"
import { readTierSettings } from "@/lib/tiers/settings"
import { Suspense } from "react"

export default function DeanProgramPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "DEAN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const settings = await readTierSettings()
  const [board, members] = await Promise.all([
    loadProgramBoard(session.campusId, settings.programCumulateScale),
    listCommitteeMembers(session.campusId),
  ])
  const waiting = board.ready.filter((row) => !row.evaluationId)

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Programme evaluation"
        description="Students appear when every year evaluation is signed. Cumulate those year rubric totals, then record the final mark and exam-cell export."
      />
      {board.ready.length === 0 ? (
        <p className="rounded-xl bg-card px-4 py-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No student has every year evaluation signed yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Signed years</th>
                <th className="px-3 py-2 font-medium">Formula</th>
                <th className="px-3 py-2 font-medium">Cumulated</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {board.ready.map((row) => (
                <tr key={row.studentId} className="border-t border-border/70 align-top">
                  <td className="px-3 py-2">
                    {row.evaluationId ? (
                      <Link
                        href={`/dean/program/${row.evaluationId}`}
                        className="font-medium hover:underline"
                      >
                        {row.studentName}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.studentName}</span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {row.programmeName}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {row.signedYears} / {row.durationYears}
                  </td>
                  <td className="px-3 py-2 max-w-sm text-muted-foreground">{row.formula}</td>
                  <td className="px-3 py-2">
                    {row.cumulatedMark ?? row.cumulatedPreview}
                  </td>
                  <td className="px-3 py-2">
                    {row.status ? (
                      <Badge variant="outline">{yearStatusLabel(row.status)}</Badge>
                    ) : (
                      "Not opened"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {board.held.length > 0 ? (
        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
          <h2 className="font-heading text-lg font-semibold">Still in year evaluation</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
            {board.held.map((row) => (
              <li key={row.studentName}>
                {row.studentName}: {row.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-heading text-lg font-semibold">Assign a programme committee</h2>
        <div className="mt-4">
          <ConstituteProgramForm
            campusId={session.campusId}
            students={waiting.map((row) => ({ id: row.studentId, name: row.studentName }))}
            members={members}
          />
        </div>
      </section>
    </PageEnter>
  )
}
