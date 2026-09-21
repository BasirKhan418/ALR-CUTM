import { notFound } from "next/navigation"
import { Forbidden } from "@/components/forbidden"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageEnter } from "@/components/page-enter"
import { SignoffDetail } from "@/components/signoff-detail"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { connectMongo } from "@/lib/db/mongo"
import { loadDeliverable } from "@/lib/deliverable/queries"
import { firstShellHref } from "@/lib/domain/roles"
import { canAccessDeliverable, sessionOwnsSignoffRole } from "@/lib/domain/signoff"
import { Suspense } from "react"

export default function SupervisorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader params={params} />
    </Suspense>
  )
}

async function Loader({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!hasRole(session, "SUPERVISOR") && !hasRole(session, "FACULTY")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const { id } = await params
  const deliverable = await loadDeliverable(id)
  if (!deliverable) notFound()
  await connectMongo()
  const assigned = await FacultyAssignment.findOne({
    courseId: deliverable.courseId,
    userId: session.userId,
    role: "FACULTY",
  })
  if (!canAccessDeliverable(session, deliverable, Boolean(assigned))) {
    return <Forbidden homeHref="/supervisor" />
  }
  const canDecide = sessionOwnsSignoffRole(
    session,
    deliverable,
    deliverable.currentStep?.role
  )
  const pubPending = deliverable.publication?.steps.find(
    (step) => step.decision === "PENDING"
  )
  const canDecidePublication = sessionOwnsSignoffRole(
    session,
    deliverable,
    pubPending?.role
  )
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageBreadcrumb
        items={[
          { href: "/supervisor", label: "Supervisor" },
          { label: deliverable.title || "Deliverable" },
        ]}
      />
      <SignoffDetail
        deliverable={deliverable}
        canDecide={canDecide}
        canDecidePublication={canDecidePublication}
      />
    </PageEnter>
  )
}
