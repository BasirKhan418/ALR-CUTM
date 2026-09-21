import type { RecordType } from "@/lib/domain/record-types"

export const DELIVERABLE_TYPES = [
  "MINOR_PROJECT",
  "MAJOR_PROJECT",
  "INTERNSHIP",
  "PG_THESIS",
] as const

export type DeliverableType = (typeof DELIVERABLE_TYPES)[number]

export const DELIVERABLE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "RETURNED",
  "REJECTED",
  "APPROVED",
  "SUBMITTED_FOR_EVALUATION",
  "WITHDRAWN",
] as const

export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number]

export const MAJOR_LR_RECORD_TYPES = [
  "PROJECT_REPORT",
  "THESIS_REPORT",
  "INTERNSHIP_REPORT",
] as const

export type MajorLrRecordType = (typeof MAJOR_LR_RECORD_TYPES)[number]

export const MAX_CANDIDATES = 3

export function isMajorLrRecordType(
  value: string
): value is MajorLrRecordType {
  return (MAJOR_LR_RECORD_TYPES as readonly string[]).includes(value)
}

export function isDeliverableType(value: string): value is DeliverableType {
  return (DELIVERABLE_TYPES as readonly string[]).includes(value)
}

export function defaultDeliverableType(
  recordType: RecordType
): DeliverableType | null {
  if (recordType === "PROJECT_REPORT") return "MAJOR_PROJECT"
  if (recordType === "INTERNSHIP_REPORT") return "INTERNSHIP"
  if (recordType === "THESIS_REPORT") return "PG_THESIS"
  return null
}

export function recordTypeForDeliverable(type: DeliverableType): RecordType {
  if (type === "INTERNSHIP") return "INTERNSHIP_REPORT"
  if (type === "PG_THESIS") return "THESIS_REPORT"
  return "PROJECT_REPORT"
}

export function deliverableLabel(type: DeliverableType) {
  if (type === "MINOR_PROJECT") return "Minor Project"
  if (type === "MAJOR_PROJECT") return "Major Project"
  if (type === "INTERNSHIP") return "Internship"
  return "PG Thesis"
}

export function deliverableStatusLabel(status: DeliverableStatus) {
  if (status === "DRAFT") return "Draft"
  if (status === "SUBMITTED") return "In sign-off"
  if (status === "RETURNED") return "Returned"
  if (status === "REJECTED") return "Rejected"
  if (status === "APPROVED") return "Approved"
  if (status === "SUBMITTED_FOR_EVALUATION") return "Submitted for evaluation"
  return "Withdrawn"
}

export function canEditDeliverable(status: DeliverableStatus) {
  return status === "DRAFT" || status === "RETURNED"
}

export function allowedDeliverableTypes(
  recordType: RecordType
): DeliverableType[] {
  if (recordType === "PROJECT_REPORT") return ["MINOR_PROJECT", "MAJOR_PROJECT"]
  if (recordType === "INTERNSHIP_REPORT") return ["INTERNSHIP"]
  if (recordType === "THESIS_REPORT") return ["PG_THESIS"]
  return []
}
