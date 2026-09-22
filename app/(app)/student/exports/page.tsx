import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { BookletRequestForm, WorkshopRequestForm } from "@/components/export-forms"
import { ExportRequestList } from "@/components/export-request-list"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { readArchivalSentence } from "@/lib/catalog/settings"
import { firstShellHref } from "@/lib/domain/roles"
import { listExportRequests, listStudentExportChoices } from "@/lib/exports/queries"
import { connection } from "next/server"
import { Suspense } from "react"

export default function StudentExportsPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  await connection()
  const session = await requireSession()
  if (!hasRole(session, "STUDENT")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const [choices, rows, archival] = await Promise.all([
    listStudentExportChoices(session.userId),
    listExportRequests({ studentId: session.userId, requestedBy: session.userId }),
    readArchivalSentence(),
  ])
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Exports"
        description={`Request a Learning Record booklet or a workshop hours certificate. The exports worker writes the PDF. ${archival}`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <BookletRequestForm years={choices.years} />
        </section>
        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <WorkshopRequestForm courses={choices.courses} />
        </section>
      </div>
      <ExportRequestList rows={rows} />
    </PageEnter>
  )
}
