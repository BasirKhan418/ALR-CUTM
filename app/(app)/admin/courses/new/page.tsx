import { CourseSetupForm } from "@/components/course-setup-form"
import { Forbidden } from "@/components/forbidden"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { readClassroomComposites } from "@/lib/catalog/settings"
import { loadSetupOptions } from "@/lib/catalog/load-manage"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function AdminNewCoursePage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
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
          { href: "/admin/courses", label: "Courses" },
          { label: "New course" },
        ]}
      />
      <PageHeader
        title="New course"
        description="Tag one of the twelve combination codes. The preview shows every required record and the normalization sentence."
      />
      <CourseSetupForm
        {...options}
        composites={composites}
        defaultCampusId={session.campusId}
        returnTo="/admin/courses"
      />
    </PageEnter>
  )
}
