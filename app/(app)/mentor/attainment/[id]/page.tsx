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

export default function MentorAttainmentDetailPage({
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
  if (!hasRole(session, "MENTOR")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const { id } = await params
  const [detail, settings] = await Promise.all([
    loadYearDetail(id, "mentor"),
    readTierSettings(),
  ])
  if (!detail) notFound()
  if (detail.campusId !== session.campusId) {
    return <Forbidden homeHref="/mentor/attainment" />
  }
  if (!detail.mentorUserIds.includes(session.userId)) {
    return <Forbidden homeHref="/mentor/attainment" />
  }
  return (
    <PageEnter>
      <YearEvaluationPanel
        detail={detail}
        flags={assessYear(session, detail, settings)}
        settings={settings}
        backHref="/mentor/attainment"
        backLabel="PO/PSO attainment"
      />
    </PageEnter>
  )
}
