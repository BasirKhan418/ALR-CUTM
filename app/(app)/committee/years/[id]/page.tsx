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

export default function CommitteeYearPage({
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
  if (!hasRole(session, "COMMITTEE_MEMBER")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const { id } = await params
  const [detail, settings] = await Promise.all([
    loadYearDetail(id, "committee"),
    readTierSettings(),
  ])
  if (!detail) notFound()
  if (!detail.committeeIds.includes(session.userId)) {
    return <Forbidden homeHref="/committee" />
  }
  return (
    <PageEnter>
      <YearEvaluationPanel
        detail={detail}
        flags={assessYear(session, detail, settings)}
        settings={settings}
        backHref="/committee"
        backLabel="Committee"
      />
    </PageEnter>
  )
}
