import Link from "next/link"
import { notFound } from "next/navigation"
import { AdminCatalogNav } from "@/components/admin-catalog-nav"
import { CourseManage } from "@/components/course-manage"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadCourseManage } from "@/lib/catalog/load-manage"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function AdminCoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader params={params} />
    </Suspense>
  )
}

async function Loader({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const { id } = await params
  const data = await loadCourseManage(id)
  if (!data) notFound()

  return (
    <PageEnter className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <AdminCatalogNav current="/admin/courses" />
        <Link
          href="/admin/courses"
          className="w-fit text-sm text-muted-foreground hover:text-foreground"
        >
          Back to courses
        </Link>
      </div>
      <CourseManage {...data} />
    </PageEnter>
  )
}
