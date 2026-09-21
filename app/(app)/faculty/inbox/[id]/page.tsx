import { notFound } from "next/navigation"
import { FacultyEntryDetail } from "@/components/faculty-entry-detail"
import { Forbidden } from "@/components/forbidden"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageEnter } from "@/components/page-enter"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { connectMongo } from "@/lib/db/mongo"
import { recordTypeLabel } from "@/lib/domain/record-types"
import { firstShellHref } from "@/lib/domain/roles"
import { loadScoreableEntry } from "@/lib/scoring/queries"
import { Suspense } from "react"

export default function FacultyInboxEntryPage({
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
  if (!hasRole(session, "FACULTY")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }

  const { id } = await params
  const entry = await loadScoreableEntry(id)
  if (!entry) notFound()

  await connectMongo()
  const assigned = await FacultyAssignment.findOne({
    courseId: entry.courseId,
    userId: session.userId,
    role: "FACULTY",
  })
  if (!assigned) {
    return <Forbidden homeHref="/faculty/inbox" />
  }

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageBreadcrumb
        items={[
          { href: "/faculty/inbox", label: "Inbox" },
          { label: headline(entry) },
        ]}
      />
      <FacultyEntryDetail entry={entry} />
    </PageEnter>
  )
}

function headline(entry: {
  recordType: string
  topic: string
  title: string
  experimentNo: string
  taskTitle: string
}) {
  if (entry.recordType === "CLASSROOM_LEARNING") return entry.topic || "Classroom session"
  if (entry.recordType === "APPLIED_ACTION_LEARNING") {
    return entry.title || `Experiment ${entry.experimentNo || ""}`.trim()
  }
  if (entry.recordType === "ACTION_LEARNING") return entry.taskTitle || "Workshop task"
  return recordTypeLabel(entry.recordType)
}
