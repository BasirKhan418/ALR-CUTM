export const PLAGIARISM_DOCUMENT_TYPES = [
  "THESIS",
  "PROJECT",
  "INTERNSHIP",
  "CLASSROOM_LEARNING",
  "APPLIED_ACTION_LEARNING",
  "ACTION_LEARNING",
  "PROGRAMMING",
] as const

export type PlagiarismDocumentType = (typeof PLAGIARISM_DOCUMENT_TYPES)[number]

export const DEFAULT_PLAGIARISM_THRESHOLDS: Record<
  PlagiarismDocumentType,
  number
> = {
  THESIS: 20,
  PROJECT: 30,
  INTERNSHIP: 30,
  CLASSROOM_LEARNING: 30,
  APPLIED_ACTION_LEARNING: 30,
  ACTION_LEARNING: 30,
  PROGRAMMING: 30,
}

export const PLAGIARISM_HOURLY_CAP_DEFAULT = 100
export const PLAGIARISM_CASE_RESPONSE_DAYS = 7

export const PLAGIARISM_TOOLS = ["STUB_PROSE", "STUB_CODE", "TURNITIN"] as const
export type PlagiarismTool = (typeof PLAGIARISM_TOOLS)[number]

export const PLAGIARISM_REPORT_STATUSES = [
  "PENDING",
  "CLEAR",
  "FLAGGED",
  "EXCLUDED",
  "FAILED",
] as const
export type PlagiarismReportStatus = (typeof PLAGIARISM_REPORT_STATUSES)[number]

export const PLAGIARISM_CASE_STATUSES = [
  "OPEN",
  "STUDENT_RESPONDED",
  "COMMITTEE_RECOMMENDED",
  "COUNCIL_RATIFIED",
  "DISMISSED",
] as const
export type PlagiarismCaseStatus = (typeof PLAGIARISM_CASE_STATUSES)[number]

export const PLAGIARISM_TARGET_TYPES = [
  "MAJOR_DELIVERABLE",
  "LR_ENTRY",
  "PROGRAMMING_UPLOAD",
] as const
export type PlagiarismTargetType = (typeof PLAGIARISM_TARGET_TYPES)[number]

export const PROSE_JOB = "plagiarism.prose"
export const CODE_JOB = "plagiarism.code"
export const CASE_TIMEOUT_JOB = "plagiarism.case.timeout"

export const THRESHOLDS_SETTING = "plagiarismThresholds"
export const HOURLY_CAP_SETTING = "plagiarismHourlyCap"

export type PlagiarismMatch = {
  id: string
  sourceLabel: string
  sourceTargetId?: string
  overlap: number
  excerpt?: string
}

export type PlagiarismExclusion = {
  matchId: string
  reason: string
  certificateFileId?: string
  bySupervisorId: string
  at: string
}

export function isPlagiarismDocumentType(
  value: string
): value is PlagiarismDocumentType {
  return (PLAGIARISM_DOCUMENT_TYPES as readonly string[]).includes(value)
}

export function documentTypeLabel(type: PlagiarismDocumentType) {
  if (type === "THESIS") return "Thesis"
  if (type === "PROJECT") return "Project"
  if (type === "INTERNSHIP") return "Internship"
  if (type === "CLASSROOM_LEARNING") return "Classroom Learning"
  if (type === "APPLIED_ACTION_LEARNING") return "Applied and Action Learning"
  if (type === "ACTION_LEARNING") return "Action Learning"
  return "Programming Practice"
}

export function caseStatusLabel(status: PlagiarismCaseStatus) {
  if (status === "OPEN") return "Open"
  if (status === "STUDENT_RESPONDED") return "Student responded"
  if (status === "COMMITTEE_RECOMMENDED") return "Committee recommended"
  if (status === "COUNCIL_RATIFIED") return "Council ratified"
  return "Dismissed"
}

export function reportStatusLabel(status: PlagiarismReportStatus) {
  if (status === "PENDING") return "Scanning"
  if (status === "CLEAR") return "Clear"
  if (status === "FLAGGED") return "Flagged"
  if (status === "EXCLUDED") return "Excluded"
  return "Failed"
}

export function scoreAfterExclusions(
  matches: readonly PlagiarismMatch[],
  exclusions: readonly { matchId: string }[],
  rawScore: number
) {
  const excluded = new Set(exclusions.map((item) => item.matchId))
  const remaining = matches.filter((item) => !excluded.has(item.id))
  if (remaining.length === 0) return 0
  if (remaining.length === matches.length) return rawScore
  const total = matches.reduce((sum, item) => sum + item.overlap, 0)
  const kept = remaining.reduce((sum, item) => sum + item.overlap, 0)
  if (total <= 0) return 0
  return Math.round(((rawScore * kept) / total) * 10) / 10
}

export function reportStatusForScore(
  score: number,
  threshold: number,
  excludedAll: boolean
): PlagiarismReportStatus {
  if (excludedAll && score === 0) return "EXCLUDED"
  return score > threshold ? "FLAGGED" : "CLEAR"
}

export function plagiarismHourKey(at = new Date()) {
  return at.toISOString().slice(0, 13)
}

export function canRespondToCase(
  status: PlagiarismCaseStatus,
  expired: boolean
) {
  return (
    (status === "OPEN" || status === "STUDENT_RESPONDED") && !expired
  )
}

export function canRecommendOnCase(
  status: PlagiarismCaseStatus,
  expired: boolean
) {
  return status === "STUDENT_RESPONDED" || (status === "OPEN" && expired)
}
