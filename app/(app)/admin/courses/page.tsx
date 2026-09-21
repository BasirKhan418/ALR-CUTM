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
import { Campus } from "@/lib/db/models/campus"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"
import { cn } from "@/lib/utils"
import { Suspense } from "react"

export default function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>
}) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminCoursesLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function AdminCoursesLoader({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>
}) {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }

  await connectMongo()
  const campuses = await Campus.find({ active: true }).sort({ name: 1 }).lean()
  const { campus: campusQuery } = await searchParams
  const selected =
    campuses.find(
      (campus) =>
        campus.slug === campusQuery || String(campus._id) === campusQuery
    ) ?? campuses.find((campus) => String(campus._id) === session.campusId)
  const campusId = selected ? String(selected._id) : session.campusId
  const courses = await cachedCampusCatalog(campusId)

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Courses"
        description={`${courses.length} in the ${selected?.name ?? session.campusName} catalog. Search by code, title, or department.`}
        action={
          <Link
            href="/admin/courses/new"
            className={cn(buttonVariants())}
          >
            <PlusIcon className="size-3.5" />
            New course
          </Link>
        }
      />
      {campuses.length > 1 ? (
        <nav className="flex w-full flex-wrap gap-1 rounded-xl bg-muted p-1 sm:w-fit">
          {campuses.map((campus) => {
            const active = String(campus._id) === campusId
            return (
              <Link
                key={String(campus._id)}
                href={`/admin/courses?campus=${campus.slug}`}
                className={cn(
                  "inline-flex h-7 items-center rounded-md px-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {campus.name}
              </Link>
            )
          })}
        </nav>
      ) : null}
      <CourseTable
        courses={courses}
        hrefBase="/admin/courses"
        empty="No courses on this campus yet. Create one to tag a combination code."
      />
    </PageEnter>
  )
}
