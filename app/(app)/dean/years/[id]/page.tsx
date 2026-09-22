import { notFound } from "next/navigation"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { YearEvaluationPanel } from "@/components/year-evaluation-panel"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { assessYear, campusAllowed } from "@/lib/tiers/access"
import { loadYearDetail } from "@/lib/tiers/queries"
import { readTierSettings } from "@/lib/tiers/settings"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function DeanYearDetailPage({
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
  if (!hasRole(session, "DEAN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const { id } = await params
  const [detail, settings] = await Promise.all([
    loadYearDetail(id, "dean"),
    readTierSettings(),
  ])
  if (!detail) notFound()
  if (!campusAllowed(session, detail.campusId) || detail.campusId !== session.campusId) {
    return <Forbidden homeHref="/dean/years" />
  }
  return (
    <PageEnter>
      <YearEvaluationPanel
        detail={detail}
        flags={assessYear(session, detail, settings)}
        settings={settings}
        backHref="/dean/years"
        backLabel="Year evaluation"
      />
    </PageEnter>
  )
}
