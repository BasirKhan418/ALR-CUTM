export const DELIVERABLE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_COMMITTEE_REVIEW",
  "SUBMITTED_FOR_EVALUATION",
  "APPROVED",
  "WITHDRAWN",
] as const

export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number]

export const PLAGIARISM_CASE_STATUSES = [
  "OPEN",
  "STUDENT_RESPONDED",
  "COMMITTEE_RECOMMENDED",
  "COUNCIL_RATIFIED",
  "DISMISSED",
] as const

export type PlagiarismCaseStatus = (typeof PLAGIARISM_CASE_STATUSES)[number]

export const YEAR_EVALUATION_STATUSES = [
  "DRAFT",
  "COMMITTEE_ASSIGNED",
  "SCORED",
  "SIGNED",
  "EXPORTED",
] as const

export type YearEvaluationStatus = (typeof YEAR_EVALUATION_STATUSES)[number]

export const PROGRAM_EVALUATION_STATUSES = [
  "DRAFT",
  "COMMITTEE_ASSIGNED",
  "SCORED",
  "SIGNED",
  "EXPORTED",
] as const

export type ProgramEvaluationStatus = (typeof PROGRAM_EVALUATION_STATUSES)[number]

export const SIGNOFF_DECISIONS = ["APPROVED", "RETURNED", "REJECTED"] as const

export type SignoffDecision = (typeof SIGNOFF_DECISIONS)[number]
