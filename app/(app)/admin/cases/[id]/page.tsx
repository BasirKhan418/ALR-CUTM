import { notFound } from "next/navigation"
import { Forbidden } from "@/components/forbidden"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageEnter } from "@/components/page-enter"
import { PlagiarismCaseDetail } from "@/components/plagiarism-case-detail"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { loadCaseView, loadCommitteeStaff } from "@/lib/plagiarism/queries"
import { Suspense } from "react"

export default function AdminCasePage({
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
  if (!hasRole(session, "ADMIN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const { id } = await params
  const view = await loadCaseView(id, session)
  if (!view) notFound()
  const staff = await loadCommitteeStaff(session.campusId)
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageBreadcrumb
        items={[
          { href: "/admin/cases", label: "Cases" },
          { label: view.title },
        ]}
      />
      <PlagiarismCaseDetail
        view={view}
        staff={staff}
        caseHref={`/admin/cases/${view.id}`}
      />
    </PageEnter>
  )
}
