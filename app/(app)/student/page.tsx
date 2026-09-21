import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { StudentCourses } from "@/components/student-courses"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadCampusCatalog } from "@/lib/catalog/queries"
import { Enrollment } from "@/lib/db/models/enrollment"
import { connectMongo } from "@/lib/db/mongo"
import { listMyEntries } from "@/lib/lr/queries"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function StudentPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <StudentCoursesLoader />
    </Suspense>
  )
}

async function StudentCoursesLoader() {
  const session = await requireSession()
  if (!hasRole(session, "STUDENT")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }

  await connectMongo()
  const [enrollments, catalog, entries] = await Promise.all([
    Enrollment.find({ studentId: session.userId }).lean(),
    loadCampusCatalog(session.campusId),
    listMyEntries(session.userId),
  ])
  const enrolledIds = new Set(enrollments.map((item) => String(item.courseId)))
  const courses = catalog.filter((course) => enrolledIds.has(course.id))

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="My courses"
        description="Pick a subject, then file only the record types that combination requires. Project, thesis, and internship stay closed until M05."
      />
      <StudentCourses courses={courses} entries={entries} />
    </PageEnter>
  )
}
