import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { PlagiarismCaseQueue } from "@/components/plagiarism-case-queue"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { loadCaseQueue } from "@/lib/plagiarism/queries"
import { Suspense } from "react"

export default function StudentCasesPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "STUDENT")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const items = await loadCaseQueue({
    campusId: session.campusId,
    studentId: session.userId,
  })
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Integrity cases"
        description="Respond before the 7-day timer. Sign-off stays paused while a case is open."
      />
      <PlagiarismCaseQueue
        items={items}
        hrefBase="/student/cases"
        empty="You have no open or closed integrity cases."
      />
    </PageEnter>
  )
}
