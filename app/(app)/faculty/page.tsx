import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { CourseTable } from "@/components/course-table"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { AdminSkeleton } from "@/components/app-shell-skeleton"
import { buttonVariants } from "@/components/ui/button"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { cachedCampusCatalog } from "@/lib/catalog/queries"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"
import { cn } from "@/lib/utils"
import { Suspense } from "react"

export default function FacultyPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <FacultyCoursesLoader />
    </Suspense>
  )
}

async function FacultyCoursesLoader() {
  const session = await requireSession()
  if (!hasRole(session, "FACULTY")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }

  const catalog = await cachedCampusCatalog(session.campusId)
  await connectMongo()
  const assignments = await FacultyAssignment.find({
    userId: session.userId,
    role: "FACULTY",
  }).lean()
  const assignedIds = new Set(assignments.map((item) => String(item.courseId)))
  const courses = catalog.filter((course) => assignedIds.has(course.id))

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Courses"
        description="Search assigned subjects by code, title, or combination. Combination code decides the record types."
        action={
          <Link
            href="/faculty/courses/new"
            className={cn(buttonVariants())}
          >
            <PlusIcon className="size-3.5" />
            New course
          </Link>
        }
      />
      <CourseTable
        courses={courses}
        hrefBase="/faculty/courses"
        empty="You are not assigned to a course yet. Create one or ask Admin to assign you."
      />
    </PageEnter>
  )
}
