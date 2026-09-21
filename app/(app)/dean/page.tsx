import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { SignoffQueue } from "@/components/signoff-queue"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadQueueForRole } from "@/lib/deliverable/queries"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function DeanPage() {
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
  const items = await loadQueueForRole({
    role: "DEAN",
    userId: session.userId,
    campusId: session.campusId,
    departmentId: session.departmentId,
  })
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Dean sign-off"
        description="You see a record only when the department has no HoD on the chain."
      />
      <SignoffQueue
        items={items}
        hrefBase="/dean"
        empty="No deliverables are waiting on Dean."
      />
    </PageEnter>
  )
}
