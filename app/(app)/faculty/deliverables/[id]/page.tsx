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
import { sessionOwnsSignoffRole } from "@/lib/domain/signoff"
import { Suspense } from "react"

export default function FacultyDeliverablePage({
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
  if (!hasRole(session, "FACULTY") && !hasRole(session, "SUPERVISOR")) {
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
  const guide =
    deliverable.supervisorId === session.userId ||
    deliverable.coSupervisorId === session.userId
  if (!assigned && !guide) {
    return <Forbidden homeHref="/faculty" />
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
          { href: `/faculty/courses/${deliverable.courseId}`, label: deliverable.courseCode },
          { label: deliverable.title || "Deliverable" },
        ]}
      />
      <SignoffDetail
        deliverable={deliverable}
        canDecide={canDecide}
        canDecidePublication={canDecidePublication}
        canExclude={guide}
        caseBase="/faculty/cases"
      />
    </PageEnter>
  )
}
