import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { YearQueueTable } from "@/components/year-tables"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { listMentorYears } from "@/lib/tiers/queries"
import { Suspense } from "react"

export default function MentorAttainmentPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "MENTOR")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const rows = await listMentorYears(session.userId, session.campusId)
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="PO/PSO attainment"
        description="One sheet per student-year. This step requires the Mentor role."
      />
      <YearQueueTable
        rows={rows}
        empty="No year evaluations for students you mentor."
      />
    </PageEnter>
  )
}
