import Link from "next/link"
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
import { cn } from "@/lib/utils"
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
  const assignedCourses = catalog.filter((course) => assignedIds.has(course.id))
  const filterCourse = courseId
    ? assignedCourses.find((course) => course.id === courseId)
    : null

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Inbox"
        description={
          filterCourse
            ? `Submitted records for ${filterCourse.code}. Read only — scoring opens later.`
            : "Submitted Classroom, Applied, and Workshop entries. Scoring opens later."
        }
      />
      {filterCourse ? (
        <Link
          href="/faculty/inbox"
          className="w-fit text-sm text-muted-foreground hover:text-foreground"
        >
          All assigned courses
        </Link>
      ) : assignedCourses.length > 1 ? (
        <nav className="flex w-full flex-wrap gap-1 rounded-xl bg-muted p-1 sm:w-fit">
          {assignedCourses.map((course) => (
            <Link
              key={course.id}
              href={`/faculty/inbox?course=${course.id}`}
              className={cn(
                "inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              )}
            >
              {course.code}
            </Link>
          ))}
        </nav>
      ) : null}
      <FacultyInbox items={items} />
    </PageEnter>
  )
}
