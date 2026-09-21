import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { SignoffQueue } from "@/components/signoff-queue"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadQueueForRole } from "@/lib/deliverable/queries"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function HodPage() {
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
  const items = await loadQueueForRole({
    role: "HOD",
    userId: session.userId,
    campusId: session.campusId,
    departmentId: session.departmentId,
  })
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="HoD sign-off"
        description="Department records waiting on you. A return stays on the student record with the reason."
      />
      <SignoffQueue
        items={items}
        hrefBase="/hod"
        empty="No department deliverables are waiting on HoD."
      />
    </PageEnter>
  )
}
