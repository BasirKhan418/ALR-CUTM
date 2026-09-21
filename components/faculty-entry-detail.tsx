import Link from "next/link"
import { FacultyScoreForm } from "@/components/faculty-score-form"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { formulaSentence } from "@/lib/domain/catalog"
import { recordTypeLabel } from "@/lib/domain/record-types"
import {
  ACTION_CRITERIA,
  ACTION_ENTRY_MAX,
  APPLIED_CRITERIA,
  APPLIED_ENTRY_MAX,
  actionTotal,
  appliedTotal,
  type ActionScores,
  type AppliedScores,
} from "@/lib/domain/scoring"
import type { ScoreableEntry } from "@/lib/scoring/types"
import { formatMarks } from "@/lib/scoring/format"
import { formatWhen } from "@/lib/ui/format"
import { cn } from "@/lib/utils"

export function FacultyEntryDetail({ entry }: { entry: ScoreableEntry }) {
  const title = headline(entry)
  const fields = fieldsFor(entry)
  const saved = savedMarks(entry)

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {entry.courseCode}
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {entry.studentName} · {entry.studentEmail}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {entry.courseTitle}
              {entry.submittedAt ? ` · Submitted ${formatWhen(entry.submittedAt)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge>{recordTypeLabel(entry.recordType)}</Badge>
            <Badge variant={entry.scoredAt ? "secondary" : "outline"}>
              {entry.scoredAt ? "Scored" : "Needs score"}
            </Badge>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Entry marks"
            value={
              saved
                ? `${formatMarks(saved.total)} / ${saved.max}`
                : "Not scored"
            }
          />
          <Stat
            label="Framework weight"
            value={
              entry.recordConfig
                ? `${entry.recordConfig.frameworkMarks} marks · ${entry.recordConfig.frameworkWeightPercent}%`
                : "—"
            }
          />
          <Stat
            label="Formula"
            value={
              entry.recordConfig
                ? formulaSentence(entry.recordConfig)
                : "Normalized through the course formula."
            }
            muted
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/faculty/courses/${entry.courseId}?tab=gradebook`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-8")}
          >
            Gradebook
          </Link>
          {entry.recordType === "CLASSROOM_LEARNING" ? (
            <Link
              href={`/faculty/courses/${entry.courseId}?tab=classroom`}
              className={cn(buttonVariants({ size: "sm" }), "h-8")}
            >
              Classroom marks
            </Link>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
          <h2 className="font-heading text-lg font-semibold">Submitted record</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Student narrative only. Marks are entered beside this record.
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.label}
                className={cn(
                  "rounded-lg bg-muted/40 px-3 py-2.5",
                  field.wide && "sm:col-span-2"
                )}
              >
                <dt className="eyebrow">{field.label}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm leading-6">
                  {field.value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {entry.recordType === "CLASSROOM_LEARNING" ? (
          <section className="rounded-xl bg-card p-4 text-sm leading-6 text-muted-foreground ring-1 ring-foreground/10 sm:p-5">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Classroom scoring
            </h2>
            <p className="mt-2">
              This session note is not scored here. Assignment, presentation,
              mid-sem, and record marks live on the course Classroom tab and
              already sit on the 10-point Framework scale.
            </p>
            <Link
              href={`/faculty/courses/${entry.courseId}?tab=classroom`}
              className={cn(buttonVariants({ size: "sm" }), "mt-4 h-8")}
            >
              Open Classroom
            </Link>
          </section>
        ) : canScoreRubric(entry) ? (
          <FacultyScoreForm entry={entry} />
        ) : (
          <section className="rounded-xl bg-card p-4 text-sm leading-6 text-muted-foreground ring-1 ring-foreground/10 sm:p-5">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Scoring
            </h2>
            <p className="mt-2">
              {entry.status !== "SUBMITTED"
                ? "Only submitted Applied and Workshop records can be scored."
                : "Project, Thesis, and Internship scores live on the course Deliverables tab."}
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p className={cn("mt-1 text-sm", muted ? "text-muted-foreground" : "font-medium")}>
        {value}
      </p>
    </div>
  )
}

function canScoreRubric(entry: ScoreableEntry) {
  return (
    entry.status === "SUBMITTED" &&
    (entry.recordType === "APPLIED_ACTION_LEARNING" ||
      entry.recordType === "ACTION_LEARNING")
  )
}

function savedMarks(entry: ScoreableEntry) {
  if (entry.recordType === "APPLIED_ACTION_LEARNING") {
    const scores = entry.facultyScores as Partial<AppliedScores>
    if (!APPLIED_CRITERIA.every((item) => Number.isFinite(scores[item.key]))) {
      return null
    }
    return {
      total: appliedTotal(scores as AppliedScores),
      max: APPLIED_ENTRY_MAX,
    }
  }
  if (entry.recordType === "ACTION_LEARNING") {
    const scores = entry.facultyScores as Partial<ActionScores>
    if (!ACTION_CRITERIA.every((item) => Number.isFinite(scores[item.key]))) {
      return null
    }
    return {
      total: actionTotal(scores as ActionScores),
      max: ACTION_ENTRY_MAX,
    }
  }
  return null
}

function headline(entry: ScoreableEntry) {
  if (entry.recordType === "CLASSROOM_LEARNING") return entry.topic || "Classroom session"
  if (entry.recordType === "APPLIED_ACTION_LEARNING") {
    return entry.title || `Experiment ${entry.experimentNo || ""}`.trim()
  }
  if (entry.recordType === "ACTION_LEARNING") return entry.taskTitle || "Workshop task"
  return recordTypeLabel(entry.recordType)
}

function fieldsFor(entry: ScoreableEntry) {
  const field = (label: string, value: string, wide = false) => ({
    label,
    value,
    wide,
  })
  const books = field("Books / Manuals Referred", entry.booksManuals, true)
  if (entry.recordType === "CLASSROOM_LEARNING") {
    return [
      field("Session date", entry.sessionDate),
      field("Hours", entry.hours),
      field("Topic", entry.topic, true),
      field("Reflection", entry.reflection, true),
      books,
    ]
  }
  if (entry.recordType === "APPLIED_ACTION_LEARNING") {
    return [
      field("Experiment no.", entry.experimentNo),
      field("Title", entry.title),
      field("Concept", entry.concept, true),
      field("Planning and execution", entry.planning, true),
      field("Result and interpretation", entry.result, true),
      field("Record", entry.recordNotes, true),
      field("Viva", entry.vivaNotes, true),
      books,
    ]
  }
  if (entry.recordType === "ACTION_LEARNING") {
    return [
      field("Task", entry.taskTitle, true),
      field("Hours contributed", entry.hoursContributed),
      field("Critical thinking / fieldwork / report", entry.criticalThinking, true),
      books,
    ]
  }
  return [books]
}
