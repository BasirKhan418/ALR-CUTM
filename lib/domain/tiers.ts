export const YEAR_EVAL_STATUSES = [
  "DRAFT",
  "COMMITTEE_ASSIGNED",
  "SCORED",
  "SIGNED",
  "EXPORTED",
] as const

export type YearEvalStatus = (typeof YEAR_EVAL_STATUSES)[number]

export const EXPORT_STATUSES = ["PENDING", "QUEUED", "READY", "FAILED"] as const
export type ExportStatus = (typeof EXPORT_STATUSES)[number]

export const YEAR_CRITERIA = [
  { id: "coverage_of_courses", label: "Coverage of Courses", max: 20 },
  { id: "coverage_of_components", label: "Coverage of Components", max: 20 },
  { id: "quality_of_content", label: "Quality of Content", max: 20 },
  { id: "aesthetics", label: "Aesthetics", max: 20 },
  { id: "presentation_discussion", label: "Presentation & Discussion", max: 20 },
] as const

export type YearCriterionId = (typeof YEAR_CRITERIA)[number]["id"]

export const YEAR_RUBRIC_MAX = 100
export const CREDIT_SOURCE = "ALR_YEAR" as const
export const CREDIT_BASKET = "COMPULSORY_ALR" as const
export const CREDIT_PER_YEAR = 1
export const BASKET_LABEL = "Compulsory Basket"
export const EXAM_CELL_JOB = "export.exam-cell"

export const YEAR_RUBRIC_SETTING = "yearWiseUsesFiveCriterion"
export const PROGRAM_RUBRIC_SETTING = "programWiseUsesFiveCriterion"
export const PROGRAM_SCALE_SETTING = "programCumulateScale"

export type RubricMark = {
  criterionId: string
  marks: number
  comment: string
}

const STATUS_LABELS: Record<YearEvalStatus, string> = {
  DRAFT: "Draft",
  COMMITTEE_ASSIGNED: "Committee assigned",
  SCORED: "Scored",
  SIGNED: "Signed",
  EXPORTED: "Exported",
}

export function isYearEvalStatus(value: string): value is YearEvalStatus {
  return (YEAR_EVAL_STATUSES as readonly string[]).includes(value)
}

export function yearStatusLabel(status: YearEvalStatus): string {
  return STATUS_LABELS[status]
}

export function exportStatusLabel(status: ExportStatus | string | undefined): string {
  if (status === "QUEUED") return "Queued"
  if (status === "READY") return "Ready"
  if (status === "FAILED") return "Failed"
  return "Not exported"
}

export function rubricTotal(scores: { criterionId: string; marks: number }[]): number | null {
  if (scores.length === 0) return null
  return YEAR_CRITERIA.reduce((sum, criterion) => {
    const row = scores.find((item) => item.criterionId === criterion.id)
    return sum + (row ? Number(row.marks) : 0)
  }, 0)
}

export function parseRubricMarks(
  scores: { criterionId: string; marks: number; comment?: string }[]
): { ok: true; scores: RubricMark[] } | { ok: false; message: string } {
  const next: RubricMark[] = []
  for (const criterion of YEAR_CRITERIA) {
    const row = scores.find((item) => item.criterionId === criterion.id)
    if (!row || !Number.isFinite(row.marks)) {
      return { ok: false, message: `${criterion.label} needs a mark.` }
    }
    if (row.marks < 0 || row.marks > criterion.max) {
      return {
        ok: false,
        message: `${criterion.label} must be between 0 and ${criterion.max}.`,
      }
    }
    next.push({
      criterionId: criterion.id,
      marks: row.marks,
      comment: (row.comment ?? "").trim(),
    })
  }
  return { ok: true, scores: next }
}

export function creditProgress(postedYears: number, durationYears: number | null) {
  return {
    posted: postedYears,
    expected: durationYears,
    label:
      durationYears && durationYears > 0
        ? `${postedYears} / ${durationYears}`
        : String(postedYears),
  }
}

export function yearIsClosed(status: YearEvalStatus) {
  return status === "SIGNED" || status === "EXPORTED"
}
