import Link from "next/link"
import { notFound } from "next/navigation"
import { Forbidden } from "@/components/forbidden"
import { LrRecordPanel } from "@/components/lr-record-panel"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageEnter } from "@/components/page-enter"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { Badge } from "@/components/ui/badge"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { loadCampusCatalog } from "@/lib/catalog/queries"
import { Enrollment } from "@/lib/db/models/enrollment"
import { connectMongo } from "@/lib/db/mongo"
import {
  isLiveLrRecordType,
  isStubLrRecordType,
} from "@/lib/domain/lr"
import { isRecordType, recordTypeLabel } from "@/lib/domain/record-types"
import { firstShellHref } from "@/lib/domain/roles"
import { combinationLabel } from "@/lib/domain/subject-map"
import {
  listMyEntries,
  loadWorkshopCertificateData,
} from "@/lib/lr/queries"
import { cn } from "@/lib/utils"
import { Suspense } from "react"

export default function StudentCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ record?: string }>
}) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Loader({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ record?: string }>
}) {
  const session = await requireSession()
  if (!hasRole(session, "STUDENT")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }

  const { id } = await params
  const { record } = await searchParams
  await connectMongo()
  const [catalog, enrollment] = await Promise.all([
    loadCampusCatalog(session.campusId),
    Enrollment.findOne({ studentId: session.userId, courseId: id }),
  ])
  const course = catalog.find((item) => item.id === id)
  if (!course) notFound()
  if (!enrollment) {
    return <Forbidden homeHref="/student" />
  }

  const requiredTypes = course.recordConfigs.map((config) => config.recordType)
  const selected =
    record && isRecordType(record) ? record : requiredTypes[0]
  const entries = await listMyEntries(session.userId, course.id)
  const activeEntries = entries.filter((entry) =>
    requiredTypes.includes(entry.recordType)
  )
  const visible = activeEntries.filter((entry) => entry.recordType === selected)
  const workshop =
    requiredTypes.includes("ACTION_LEARNING")
      ? await loadWorkshopCertificateData(
          session.userId,
          course,
          session.name,
          session.email
        )
      : null
  const submittedHours =
    workshop?.tasks
      .filter((task) => task.status === "SUBMITTED")
      .reduce((sum, task) => sum + task.hours, 0) ?? 0
  const draftHours =
    workshop?.tasks
      .filter((task) => task.status === "DRAFT")
      .reduce((sum, task) => sum + task.hours, 0) ?? 0

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageBreadcrumb
        items={[
          { href: "/student", label: "My courses" },
          { label: course.code },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {course.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {course.termName} · {course.departmentName}. Tabs follow the
          combination code — not a fixed Theory form.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge>{combinationLabel(course.combinationCode)}</Badge>
          <Badge variant="secondary">Delivery {course.deliveryMode}</Badge>
        </div>
      </div>
      {workshop ? (
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="eyebrow">Workshop hours</p>
          <p className="mt-1 font-heading text-2xl font-semibold">
            {workshop.totalHours} hours
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Hours, not session count. {submittedHours} submitted
            {draftHours > 0 ? ` · ${draftHours} in draft` : ""}. PDF
            certificate exports later.
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Certificate data (JSON)
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              {JSON.stringify(workshop, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
      {activeEntries.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="text-sm font-medium">Your records</p>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {activeEntries.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/student/courses/${course.id}?record=${entry.recordType}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2.5 ring-1 ring-foreground/10 hover:bg-muted/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {entry.topic ||
                        entry.title ||
                        entry.taskTitle ||
                        recordTypeLabel(entry.recordType)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {recordTypeLabel(entry.recordType)}
                    </span>
                  </span>
                  <Badge variant={entry.status === "SUBMITTED" ? "default" : "outline"}>
                    {entry.status === "SUBMITTED" ? "Submitted" : "Draft"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <nav className="flex w-full flex-wrap gap-1 rounded-xl bg-muted p-1 sm:w-fit">
        {requiredTypes.map((type) => {
          const active = type === selected
          const count = entries.filter((entry) => entry.recordType === type).length
          return (
            <Link
              key={type}
              href={`/student/courses/${course.id}?record=${type}`}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {recordTypeLabel(type)}
              {isLiveLrRecordType(type) && count > 0 ? (
                <span className="text-xs text-muted-foreground">{count}</span>
              ) : null}
              {isStubLrRecordType(type) ? (
                <span className="text-xs text-muted-foreground">M05</span>
              ) : null}
            </Link>
          )
        })}
      </nav>
      {selected ? (
        <LrRecordPanel
          key={`${selected}-${visible.length}`}
          courseId={course.id}
          recordType={selected}
          required={requiredTypes.includes(selected)}
          entries={visible}
        />
      ) : (
        <div className="rounded-xl bg-card p-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
          This subject has no Learning Record types yet.
        </div>
      )}
    </PageEnter>
  )
}
