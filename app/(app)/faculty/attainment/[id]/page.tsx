import { notFound } from "next/navigation"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { YearEvaluationPanel } from "@/components/year-evaluation-panel"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { assessYear } from "@/lib/tiers/access"
import { loadYearDetail } from "@/lib/tiers/queries"
import { readTierSettings } from "@/lib/tiers/settings"
import { Suspense } from "react"

export default function FacultyAttainmentDetailPage({
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
  if (!hasRole(session, "FACULTY")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const { id } = await params
  const [detail, settings] = await Promise.all([
    loadYearDetail(id, "faculty"),
    readTierSettings(),
  ])
  if (!detail) notFound()
  if (detail.campusId !== session.campusId) {
    return <Forbidden homeHref="/faculty/attainment" />
  }
  return (
    <PageEnter>
      <YearEvaluationPanel
        detail={detail}
        flags={assessYear(session, detail, settings)}
        settings={settings}
        backHref="/faculty/attainment"
        backLabel="CO attainment"
      />
    </PageEnter>
  )
}
