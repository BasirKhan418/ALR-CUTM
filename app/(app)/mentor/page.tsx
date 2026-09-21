import { CourseTable } from "@/components/course-table"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { SessionFacts } from "@/components/session-facts"
import { AdminSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { cachedCampusCatalog } from "@/lib/catalog/queries"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function MentorPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <MentorCoursesLoader />
    </Suspense>
  )
}

async function MentorCoursesLoader() {
  const session = await requireSession()
  if (!hasRole(session, "MENTOR")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }

  const catalog = await cachedCampusCatalog(session.campusId)
  await connectMongo()
  const assignments = await FacultyAssignment.find({
    userId: session.userId,
    role: "MENTOR",
  }).lean()
  const assignedIds = new Set(assignments.map((item) => String(item.courseId)))
  const courses = catalog.filter((course) => assignedIds.has(course.id))

  return (
    <PageEnter className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Mentor workspace</p>
        <h1 className="font-heading text-3xl font-semibold">PO / PSO courses</h1>
        <p className="text-sm text-muted-foreground">
          These are subjects where you are the mentor, independently of faculty
          assignment.
        </p>
        <SessionFacts session={session} />
      </div>
      <CourseTable
        courses={courses}
        empty="You are not assigned as PO/PSO mentor on any course yet."
      />
    </PageEnter>
  )
}
