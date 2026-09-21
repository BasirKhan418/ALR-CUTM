import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { StudentCourses } from "@/components/student-courses"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadCampusCatalog } from "@/lib/catalog/queries"
import { Enrollment } from "@/lib/db/models/enrollment"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { connectMongo } from "@/lib/db/mongo"
import { recordTypeForDeliverable } from "@/lib/domain/deliverable"
import { listMyEntries } from "@/lib/lr/queries"
import { loadStudentScores } from "@/lib/scoring/queries"
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
  const [scores, deliverableRows] = await Promise.all([
    loadStudentScores(
      session.userId,
      courses.map((course) => course.id)
    ),
    MajorDeliverable.find({ candidateIds: session.userId })
      .select("courseId type status")
      .lean(),
  ])
  const deliverables = deliverableRows.map((row) => ({
    courseId: String(row.courseId),
    recordType: recordTypeForDeliverable(row.type),
    status: row.status,
  }))

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="My courses"
        description="Open a subject to file the record types that combination requires. Scores are the normalized Framework contribution, not a raw average."
      />
      <StudentCourses
        courses={courses}
        entries={entries}
        scores={scores}
        deliverables={deliverables}
      />
    </PageEnter>
  )
}
