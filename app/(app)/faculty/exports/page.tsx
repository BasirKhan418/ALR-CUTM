import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { BookletRequestForm } from "@/components/export-forms"
import { ExportRequestList } from "@/components/export-request-list"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { listExportRequests, listScopedStudents } from "@/lib/exports/queries"
import { listAcademicYears } from "@/lib/tiers/queries"
import { connection } from "next/server"
import { Suspense } from "react"

export default function FacultyExportsPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  await connection()
  const session = await requireSession()
  if (!hasRole(session, "FACULTY", "HOD")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const [years, students, rows] = await Promise.all([
    listAcademicYears(),
    listScopedStudents({
      userId: session.userId,
      campusId: session.campusId,
      departmentId: session.departmentId,
      audience: "FACULTY",
    }),
    listExportRequests({ requestedBy: session.userId }),
  ])
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Exports"
        description="Request a Learning Record booklet for a student on one of your courses."
      />
      <section className="max-w-md rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <BookletRequestForm years={years} students={students} />
      </section>
      <ExportRequestList rows={rows} />
    </PageEnter>
  )
}
