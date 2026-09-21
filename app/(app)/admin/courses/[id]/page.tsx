import { notFound } from "next/navigation"
import { CourseManage } from "@/components/course-manage"
import { Forbidden } from "@/components/forbidden"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
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
    <PageEnter className="flex w-full flex-col gap-6">
      <PageBreadcrumb
        items={[
          { href: "/admin/courses", label: "Courses" },
          { label: data.course.code },
        ]}
      />
      <CourseManage {...data} />
    </PageEnter>
  )
}
