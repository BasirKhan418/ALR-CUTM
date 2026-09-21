import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { CourseTable } from "@/components/course-table"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { SessionFacts } from "@/components/session-facts"
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
    <PageEnter className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Faculty workspace</p>
          <h1 className="font-heading text-3xl font-semibold">Courses</h1>
          <p className="text-sm text-muted-foreground">
            Assigned subjects only. Each card shows the derived record types —
            not a fixed Theory form.
          </p>
          <SessionFacts session={session} />
        </div>
        <Link
          href="/faculty/courses/new"
          className={cn(buttonVariants({ size: "sm" }), "h-8")}
        >
          <PlusIcon className="size-3.5" />
          New course
        </Link>
      </div>
      <CourseTable
        courses={courses}
        hrefFor={(course) => `/faculty/courses/${course.id}`}
        empty="You are not assigned to a course yet. Create one or ask Admin to assign you."
      />
    </PageEnter>
  )
}
