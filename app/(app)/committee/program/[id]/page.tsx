import { notFound } from "next/navigation"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { ProgramEvaluationPanel } from "@/components/program-evaluation-panel"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { assessProgram } from "@/lib/tiers/access"
import { loadProgramDetail } from "@/lib/tiers/queries"
import { readTierSettings } from "@/lib/tiers/settings"
import { Suspense } from "react"

export default function CommitteeProgramPage({
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
  const settings = await readTierSettings()
  const detail = await loadProgramDetail(id, settings.programCumulateScale)
  if (!detail) notFound()
  if (!detail.committeeIds.includes(session.userId)) {
    return <Forbidden homeHref="/committee" />
  }
  return (
    <PageEnter>
      <ProgramEvaluationPanel
        detail={detail}
        flags={assessProgram(session, detail, settings)}
        settings={settings}
        backHref="/committee"
        backLabel="Committee"
      />
    </PageEnter>
  )
}
