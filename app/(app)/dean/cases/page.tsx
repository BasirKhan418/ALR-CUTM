import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { PlagiarismCaseQueue } from "@/components/plagiarism-case-queue"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { loadCaseQueue } from "@/lib/plagiarism/queries"
import { Suspense } from "react"

export default function DeanCasesPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "DEAN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const items = await loadCaseQueue({ campusId: session.campusId })
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Integrity cases"
        description="Assign a committee that does not include the student’s supervisor or guide, then ratify or dismiss."
      />
      <PlagiarismCaseQueue
        items={items}
        hrefBase="/dean/cases"
        empty="No integrity cases on this campus."
      />
    </PageEnter>
  )
}
