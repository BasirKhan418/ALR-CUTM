import { CourseSetupForm } from "@/components/course-setup-form"
import { Forbidden } from "@/components/forbidden"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
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
    <PageEnter className="flex w-full flex-col gap-6">
      <PageBreadcrumb
        items={[
          { href: "/faculty", label: "Courses" },
          { label: "New course" },
        ]}
      />
      <PageHeader
        title="New course"
        description="The combination code decides required records. You will be assigned as faculty automatically."
      />
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
