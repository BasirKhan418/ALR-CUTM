import Link from "next/link"
import { CourseSetupForm } from "@/components/course-setup-form"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadSetupOptions } from "@/lib/catalog/load-manage"
import { readClassroomComposites } from "@/lib/catalog/settings"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function FacultyNewCoursePage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "FACULTY")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const [options, composites] = await Promise.all([
    loadSetupOptions(),
    readClassroomComposites(),
  ])

  return (
    <PageEnter className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Faculty workspace</p>
        <h1 className="font-heading text-3xl font-semibold">New course</h1>
        <p className="text-sm text-muted-foreground">
          The combination code decides required records. You will be assigned as
          faculty automatically.
        </p>
        <Link
          href="/faculty"
          className="w-fit text-sm text-muted-foreground hover:text-foreground"
        >
          Back to courses
        </Link>
      </div>
      <CourseSetupForm
        campuses={options.campuses.filter((campus) => campus.id === session.campusId)}
        departments={options.departments}
        programmes={options.programmes}
        terms={options.terms}
        composites={composites}
        defaultCampusId={session.campusId}
        lockCampus
        returnTo="/faculty/courses"
      />
    </PageEnter>
  )
}
