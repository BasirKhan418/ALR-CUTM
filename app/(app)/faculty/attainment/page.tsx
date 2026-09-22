import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { YearQueueTable } from "@/components/year-tables"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { listFacultyYears } from "@/lib/tiers/queries"
import { Suspense } from "react"

export default function FacultyAttainmentPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "FACULTY")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const rows = await listFacultyYears(session.userId, session.campusId)
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="CO attainment"
        description="Year compiles for students in your courses. Signed and missing CO sheets are listed on each year."
      />
      <YearQueueTable rows={rows} empty="No year evaluations include your courses yet." />
    </PageEnter>
  )
}
