import Link from "next/link"
import { AdminCatalogNav } from "@/components/admin-catalog-nav"
import { CourseSetupForm } from "@/components/course-setup-form"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
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
    <PageEnter className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Administration</p>
        <h1 className="font-heading text-3xl font-semibold">New course</h1>
        <p className="text-sm text-muted-foreground">
          Tag one of the twelve combination codes. The preview shows every
          required record and the normalization sentence.
        </p>
        <AdminCatalogNav current="/admin/courses" />
        <Link href="/admin/courses" className="w-fit text-sm text-muted-foreground hover:text-foreground">
          Back to courses
        </Link>
      </div>
      <CourseSetupForm
        {...options}
        composites={composites}
        defaultCampusId={session.campusId}
        returnTo="/admin/courses"
      />
    </PageEnter>
  )
}
