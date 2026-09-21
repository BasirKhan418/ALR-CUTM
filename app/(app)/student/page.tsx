import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { SessionFacts } from "@/components/session-facts"
import { StudentCourses } from "@/components/student-courses"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadCampusCatalog } from "@/lib/catalog/queries"
import { Enrollment } from "@/lib/db/models/enrollment"
import { connectMongo } from "@/lib/db/mongo"
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
  const enrollments = await Enrollment.find({ studentId: session.userId }).lean()
  const catalog = await loadCampusCatalog(session.campusId)
  const enrolledIds = new Set(enrollments.map((item) => String(item.courseId)))
  const courses = catalog.filter((course) => enrolledIds.has(course.id))

  return (
    <PageEnter className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Student workspace</p>
        <h1 className="font-heading text-3xl font-semibold">My courses</h1>
        <p className="text-sm text-muted-foreground">
          Required records come from the subject combination. Submission opens
          in the next milestone — status is not opened.
        </p>
        <SessionFacts session={session} />
      </div>
      <StudentCourses courses={courses} />
    </PageEnter>
  )
}
