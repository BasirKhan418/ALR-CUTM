import Link from "next/link"
import { notFound } from "next/navigation"
import { Forbidden } from "@/components/forbidden"
import { LrRecordPanel } from "@/components/lr-record-panel"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PageEnter } from "@/components/page-enter"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { Badge } from "@/components/ui/badge"
import { SubjectScoreCard } from "@/components/subject-score-card"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { DECLARATION_VERSION } from "@/lib/domain/declaration"
import { loadCampusCatalog } from "@/lib/catalog/queries"
import { Enrollment } from "@/lib/db/models/enrollment"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { connectMongo } from "@/lib/db/mongo"
import {
  deliverableStatusLabel,
  isMajorLrRecordType,
  recordTypeForDeliverable,
} from "@/lib/domain/deliverable"
import {
  loadCourseDeliverable,
  loadEnrolledStudents,
  loadStaffOptions,
} from "@/lib/deliverable/queries"
import { isLiveLrRecordType } from "@/lib/domain/lr"
import { isRecordType, recordTypeLabel } from "@/lib/domain/record-types"
import { firstShellHref } from "@/lib/domain/roles"
import { combinationLabel } from "@/lib/domain/subject-map"
import {
  listMyEntries,
  loadWorkshopCertificateData,
} from "@/lib/lr/queries"
import { loadProgrammingUpload } from "@/lib/plagiarism/queries"
import { loadSubjectScores } from "@/lib/scoring/queries"
import { formatMarks } from "@/lib/scoring/format"
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
  const [entries, scores, deliverable, staff, classmates, programming] = await Promise.all([
    listMyEntries(session.userId, course.id),
    loadSubjectScores(session.userId, course.id),
    selected && isMajorLrRecordType(selected)
      ? loadCourseDeliverable(session.userId, course.id, selected)
      : Promise.resolve(null),
    loadStaffOptions(session.campusId),
    loadEnrolledStudents(course.id),
    selected === "APPLIED_ACTION_LEARNING"
      ? loadProgrammingUpload(session.userId, course.id)
      : Promise.resolve(null),
  ])
  const activeEntries = entries.filter((entry) =>
    requiredTypes.includes(entry.recordType)
  )
  const visibleScores = scores.filter((score) =>
    requiredTypes.includes(score.recordType)
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
  const myDeliverables = await MajorDeliverable.find({
    courseId: course.id,
    candidateIds: session.userId,
  })
    .select("type status")
    .lean()
  const deliverableByRecord = new Map(
    myDeliverables.map((row) => [recordTypeForDeliverable(row.type), row.status])
  )
  const submitted =
    activeEntries.filter((entry) => entry.status === "SUBMITTED").length +
    myDeliverables.filter((row) =>
      (
        [
          "SUBMITTED",
          "APPROVED",
          "SUBMITTED_FOR_EVALUATION",
        ] as const
      ).includes(row.status)
    ).length
  const drafts =
    activeEntries.filter((entry) => entry.status === "DRAFT").length +
    myDeliverables.filter(
      (row) => row.status === "DRAFT" || row.status === "RETURNED"
    ).length
  const scored = visibleScores.filter((score) => score.computedAt).length

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageBreadcrumb
        items={[
          { href: "/student", label: "My courses" },
          { label: course.code },
        ]}
      />

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {course.code}
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              {course.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {course.termName} · {course.departmentName}. File only the record
              types this combination requires.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge>{combinationLabel(course.combinationCode)}</Badge>
            <Badge variant="secondary">Delivery {course.deliveryMode}</Badge>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Required records" value={String(requiredTypes.length)} />
          <Stat
            label="Submitted"
            value={submitted === 0 ? "None yet" : String(submitted)}
          />
          <Stat
            label="Drafts"
            value={drafts === 0 ? "None" : String(drafts)}
          />
          <Stat
            label="Scored"
            value={
              scored === 0
                ? "Waiting on faculty"
                : `${scored} of ${requiredTypes.length}`
            }
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <div className="flex min-w-0 flex-col gap-4">
          <nav className="flex w-full flex-wrap gap-1 rounded-xl bg-muted p-1">
            {requiredTypes.map((type) => {
              const active = type === selected
              const count = entries.filter((entry) => entry.recordType === type)
                .length
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
                  {isMajorLrRecordType(type) && deliverableByRecord.has(type) ? (
                    <span className="text-xs text-muted-foreground">1</span>
                  ) : null}
                </Link>
              )
            })}
          </nav>
          {selected ? (
            <LrRecordPanel
              key={`${selected}-${visible.length}-${deliverable?.id ?? "new"}`}
              courseId={course.id}
              recordType={selected}
              required={requiredTypes.includes(selected)}
              entries={visible}
              deliverable={deliverable}
              staff={staff}
              classmates={classmates}
              programming={programming}
              declarationLabel={
                session.declarationAcceptedAt
                  ? `Accepted on ${session.declarationAcceptedAt.slice(0, 10)} · v ${DECLARATION_VERSION}`
                  : null
              }
            />
          ) : (
            <div className="rounded-xl bg-card p-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
              This subject has no Learning Record types yet.
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="font-heading text-base font-semibold">Progress</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One tab per required record type — not a fixed Theory form.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {requiredTypes.map((type) => {
                const typeEntries = activeEntries.filter(
                  (entry) => entry.recordType === type
                )
                const typeSubmitted = typeEntries.filter(
                  (entry) => entry.status === "SUBMITTED"
                ).length
                const typeDrafts = typeEntries.filter(
                  (entry) => entry.status === "DRAFT"
                ).length
                const score = visibleScores.find(
                  (item) => item.recordType === type && item.computedAt
                )
                return (
                  <li key={type}>
                    <Link
                      href={`/student/courses/${course.id}?record=${type}`}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 ring-1 ring-foreground/10",
                        type === selected
                          ? "bg-muted/60"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {recordTypeLabel(type)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {isMajorLrRecordType(type)
                            ? deliverableByRecord.has(type)
                              ? deliverableStatusLabel(deliverableByRecord.get(type)!)
                              : "Not started"
                            : typeSubmitted > 0
                              ? `${typeSubmitted} submitted${typeDrafts > 0 ? ` · ${typeDrafts} draft` : ""}`
                              : typeDrafts > 0
                                ? `${typeDrafts} draft`
                                : "Not started"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {score
                          ? `${formatMarks(score.normalized)} / ${score.frameworkMarks}`
                          : "—"}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          {workshop ? (
            <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="eyebrow">Workshop hours</p>
              <p className="mt-1 font-heading text-2xl font-semibold">
                {workshop.totalHours} hours
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {draftHours > 0
                  ? `Hours, not session count. ${submittedHours} submitted · ${draftHours} in draft.`
                  : `Hours, not session count. ${submittedHours} submitted.`}
              </p>
            </section>
          ) : null}

          {visibleScores.length > 0 ? (
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="font-heading text-base font-semibold">
                  Your scores
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Normalized Framework contribution — not a raw average.
                </p>
              </div>
              {visibleScores.map((score) => (
                <SubjectScoreCard
                  key={score.recordType}
                  score={score}
                  compact
                />
              ))}
            </section>
          ) : null}

          {activeEntries.length > 0 ? (
            <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <h2 className="font-heading text-base font-semibold">
                Your records
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {activeEntries.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/student/courses/${course.id}?record=${entry.recordType}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 ring-1 ring-foreground/10 hover:bg-muted/40"
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
                      <Badge
                        variant={
                          entry.status === "SUBMITTED" ? "default" : "outline"
                        }
                      >
                        {entry.status === "SUBMITTED" ? "Submitted" : "Draft"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </PageEnter>
  )
}

function Stat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
