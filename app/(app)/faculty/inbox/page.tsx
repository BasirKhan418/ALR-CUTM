import { FacultyInbox } from "@/components/faculty-inbox"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { AdminSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { cachedCampusCatalog } from "@/lib/catalog/queries"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"
import { loadFacultyInbox } from "@/lib/lr/queries"
import { Suspense } from "react"

export default function FacultyInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>
}) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Loader searchParams={searchParams} />
    </Suspense>
  )
}

async function Loader({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>
}) {
  const session = await requireSession()
  if (!hasRole(session, "FACULTY")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }

  const { course: courseId } = await searchParams
  await connectMongo()
  const [items, catalog, assignments] = await Promise.all([
    loadFacultyInbox(session.userId, courseId),
    cachedCampusCatalog(session.campusId),
    FacultyAssignment.find({
      userId: session.userId,
      role: "FACULTY",
    }).lean(),
  ])
  const assignedIds = new Set(assignments.map((item) => String(item.courseId)))
  const assignedCourses = catalog
    .filter((course) => assignedIds.has(course.id))
    .map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
    }))
  const filterCourse = courseId
    ? assignedCourses.find((course) => course.id === courseId)
    : null

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Inbox"
        description="Filter by course or record type, then open a row to score it. Entry marks and the normalized subject contribution stay in the table."
      />
      <FacultyInbox
        items={items}
        courses={assignedCourses}
        selectedCourseId={filterCourse?.id ?? ""}
      />
    </PageEnter>
  )
}
