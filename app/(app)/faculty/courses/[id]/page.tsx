import Link from "next/link"
import { notFound } from "next/navigation"
import { CourseManage } from "@/components/course-manage"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadCourseManage } from "@/lib/catalog/load-manage"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function FacultyCoursePage({
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
  if (!hasRole(session, "FACULTY", "ADMIN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const { id } = await params
  const data = await loadCourseManage(id)
  if (!data) notFound()

  await connectMongo()
  const assigned = await FacultyAssignment.findOne({
    courseId: id,
    userId: session.userId,
    role: "FACULTY",
  })
  const sameDept =
    !session.departmentId || session.departmentId === data.departmentId
  if (
    !hasRole(session, "ADMIN") &&
    !assigned &&
    !(session.campusId === data.campusId && sameDept)
  ) {
    return <Forbidden homeHref="/faculty" />
  }

  return (
    <PageEnter className="flex w-full flex-col gap-5">
      <Link
        href="/faculty"
        className="w-fit text-sm text-muted-foreground hover:text-foreground"
      >
        Back to courses
      </Link>
      <CourseManage {...data} />
    </PageEnter>
  )
}
