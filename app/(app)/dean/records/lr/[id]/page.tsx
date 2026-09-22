import { notFound } from "next/navigation"
import { FacultyEntryDetail } from "@/components/faculty-entry-detail"
import { Forbidden } from "@/components/forbidden"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageEnter } from "@/components/page-enter"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { recordTypeLabel } from "@/lib/domain/record-types"
import { loadScoreableEntry } from "@/lib/scoring/queries"
import { Suspense } from "react"

export default function DeanRecordPage({
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
  const entry = await loadScoreableEntry(id)
  if (!entry) notFound()
  if (!hasRole(session, "ADMIN") && session.campusId !== entry.campusId) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageBreadcrumb
        items={[
          { href: "/dean/years", label: "Year evaluation" },
          { label: recordTypeLabel(entry.recordType) },
        ]}
      />
      <FacultyEntryDetail entry={entry} readOnly />
    </PageEnter>
  )
}
