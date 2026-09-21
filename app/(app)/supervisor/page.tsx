import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { SignoffQueue } from "@/components/signoff-queue"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadQueueForRole } from "@/lib/deliverable/queries"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function SupervisorPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "SUPERVISOR") && !hasRole(session, "FACULTY")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const [mine, co] = await Promise.all([
    loadQueueForRole({
      role: "SUPERVISOR",
      userId: session.userId,
      campusId: session.campusId,
      departmentId: session.departmentId,
    }),
    loadQueueForRole({
      role: "CO_SUPERVISOR",
      userId: session.userId,
      campusId: session.campusId,
      departmentId: session.departmentId,
    }),
  ])
  const seen = new Set<string>()
  const items = [...mine, ...co].filter((item) => {
    const key = `${item.waitingKind}-${item.id}-${item.waitingOn}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Sign-off queue"
        description="Approve, return, or reject the current step. Co-supervisor is skipped when the record has none."
      />
      <SignoffQueue
        items={items}
        hrefBase="/supervisor"
        empty="No deliverables are waiting on you."
      />
    </PageEnter>
  )
}
