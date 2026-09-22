import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { YearQueueTable } from "@/components/year-tables"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { listHodYears } from "@/lib/tiers/queries"
import { Suspense } from "react"

export default function HodYearsPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "HOD")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const rows = await listHodYears(session.campusId, session.departmentId)
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Year status"
        description="Read-only year evaluations for students in your department."
      />
      <YearQueueTable rows={rows} empty="No year evaluations in your department." />
    </PageEnter>
  )
}
