import Link from "next/link"
import { notFound } from "next/navigation"
import { ClassroomScorePanel } from "@/components/classroom-score-panel"
import { CourseGradebook } from "@/components/course-gradebook"
import { FacultyDeliverableCard } from "@/components/faculty-deliverable-card"
import { CourseManage } from "@/components/course-manage"
import { FacultyCourseTabs, type FacultyCourseTab } from "@/components/faculty-course-tabs"
import { Forbidden } from "@/components/forbidden"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageEnter } from "@/components/page-enter"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadCourseManage } from "@/lib/catalog/load-manage"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"
import { isMajorLrRecordType } from "@/lib/domain/deliverable"
import { loadCourseDeliverables } from "@/lib/deliverable/queries"
import {
  loadClassroomComponents,
  loadCourseGradebook,
} from "@/lib/scoring/queries"
import { Suspense } from "react"

export default function FacultyCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader params={params} searchParams={searchParams} />
    </Suspense>
  )
}

function tabFrom(value?: string): FacultyCourseTab {
  if (value === "classroom" || value === "gradebook" || value === "deliverables") {
    return value
  }
  return "setup"
}

async function Loader({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await requireSession()
  if (!hasRole(session, "FACULTY", "ADMIN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const { id } = await params
  const { tab: tabParam } = await searchParams
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

  const canScore = Boolean(assigned)
  const classroomConfig = data.course.recordConfigs.find(
    (config) => config.recordType === "CLASSROOM_LEARNING"
  )
  const hasMajor = data.course.recordConfigs.some((config) =>
    isMajorLrRecordType(config.recordType)
  )
  const requested = tabFrom(tabParam)
  const tab =
    requested === "classroom" && (!canScore || !classroomConfig)
      ? "setup"
      : requested === "gradebook" && !canScore
        ? "setup"
        : requested === "deliverables" && (!canScore || !hasMajor)
          ? "setup"
          : requested

  const [classroomRows, gradebook, deliverables] = canScore
    ? await Promise.all([
        classroomConfig ? loadClassroomComponents(id) : Promise.resolve([]),
        loadCourseGradebook(id),
        hasMajor ? loadCourseDeliverables(id) : Promise.resolve([]),
      ])
    : [[], [], []]

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageBreadcrumb
        items={[
          { href: "/faculty", label: "Courses" },
          { label: data.course.code },
        ]}
        extra={
          <Link
            href={`/faculty/inbox?course=${id}`}
            className="hover:text-foreground"
          >
            View inbox
          </Link>
        }
      />
      {canScore ? (
        <FacultyCourseTabs
          courseId={id}
          active={tab}
          showClassroom={Boolean(classroomConfig)}
          showDeliverables={hasMajor}
        />
      ) : null}
      {tab === "classroom" && classroomConfig ? (
        <ClassroomScorePanel
          courseId={id}
          config={classroomConfig}
          students={data.enrolled}
          rows={classroomRows}
        />
      ) : null}
      {tab === "gradebook" ? (
        <CourseGradebook configs={data.course.recordConfigs} rows={gradebook} />
      ) : null}
      {tab === "deliverables" ? (
        <div className="flex flex-col gap-4">
          {deliverables.length === 0 ? (
            <p className="rounded-xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
              No major deliverables have been started on this course.
            </p>
          ) : (
            deliverables.map((item) => (
              <FacultyDeliverableCard key={item.id} deliverable={item} />
            ))
          )}
        </div>
      ) : null}
      {tab === "setup" ? <CourseManage {...data} /> : null}
    </PageEnter>
  )
}
