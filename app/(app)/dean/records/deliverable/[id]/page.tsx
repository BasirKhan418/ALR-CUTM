import { notFound } from "next/navigation"
import { Forbidden } from "@/components/forbidden"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageEnter } from "@/components/page-enter"
import { Badge } from "@/components/ui/badge"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function DeanDeliverableRecordPage({
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
  if (!hasRole(session, "DEAN", "HOD", "ADMIN", "COMMITTEE_MEMBER")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const { id } = await params
  await connectMongo()
  const deliverable = await MajorDeliverable.findById(id).lean()
  if (!deliverable) notFound()
  if (!hasRole(session, "ADMIN") && session.campusId !== String(deliverable.campusId)) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageBreadcrumb
        items={[
          { href: "/dean/years", label: "Year evaluation" },
          { label: deliverable.title || "Deliverable" },
        ]}
      />
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {deliverable.title || "Untitled deliverable"}
          </h1>
          <Badge variant="outline">{deliverable.type.replaceAll("_", " ")}</Badge>
          <Badge>{deliverable.status}</Badge>
        </div>
        <ul className="mt-4 flex flex-col gap-1 text-sm">
          {deliverable.candidates.map((candidate: { userId: unknown; name: string; registrationNo?: string }) => (
            <li key={String(candidate.userId)}>
              {candidate.name}
              {candidate.registrationNo ? ` · ${candidate.registrationNo}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </PageEnter>
  )
}
