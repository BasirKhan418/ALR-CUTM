import { notFound } from "next/navigation"
import { Forbidden } from "@/components/forbidden"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageEnter } from "@/components/page-enter"
import { SignoffDetail } from "@/components/signoff-detail"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadDeliverable } from "@/lib/deliverable/queries"
import { firstShellHref } from "@/lib/domain/roles"
import { sessionOwnsSignoffRole } from "@/lib/domain/signoff"
import { Suspense } from "react"

export default function HodDetailPage({
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
  if (!hasRole(session, "HOD")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const { id } = await params
  const deliverable = await loadDeliverable(id)
  if (!deliverable) notFound()
  if (session.departmentId !== deliverable.departmentId) {
    return <Forbidden homeHref="/hod" />
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
          { href: "/hod", label: "HoD" },
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
