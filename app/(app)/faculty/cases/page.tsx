import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { PlagiarismCaseQueue } from "@/components/plagiarism-case-queue"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { loadCaseQueue } from "@/lib/plagiarism/queries"
import { Suspense } from "react"

export default function FacultyCasesPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "FACULTY") && !hasRole(session, "COMMITTEE_MEMBER")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const items = await loadCaseQueue({
    campusId: session.campusId,
    committeeId: session.userId,
  })
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Integrity cases"
        description="Cases where you are an assigned committee member. Guides of that student are never listed here as members."
      />
      <PlagiarismCaseQueue
        items={items}
        hrefBase="/faculty/cases"
        empty="You are not assigned to any integrity cases."
      />
    </PageEnter>
  )
}
