import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { AdminCatalogNav } from "@/components/admin-catalog-nav"
import { CourseTable } from "@/components/course-table"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { SessionFacts } from "@/components/session-facts"
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
    <PageEnter className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Administration</p>
          <h1 className="font-heading text-3xl font-semibold">Courses</h1>
          <p className="text-sm text-muted-foreground">
            {courses.length} in the {selected?.name ?? session.campusName}{" "}
            catalog. Combination code decides the record types.
          </p>
          <SessionFacts session={session} />
          <AdminCatalogNav current="/admin/courses" />
        </div>
        <Link
          href="/admin/courses/new"
          className={cn(buttonVariants({ size: "sm" }), "h-8")}
        >
          <PlusIcon className="size-3.5" />
          New course
        </Link>
      </div>
      {campuses.length > 1 ? (
        <nav className="flex w-fit flex-wrap rounded-lg bg-muted p-[3px]">
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
        hrefFor={(course) => `/admin/courses/${course.id}`}
        empty="No courses on this campus yet. Create one to tag a combination code."
      />
    </PageEnter>
  )
}
