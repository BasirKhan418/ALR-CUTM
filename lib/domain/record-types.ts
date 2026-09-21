export const RECORD_TYPES = [
  "CLASSROOM_LEARNING",
  "APPLIED_ACTION_LEARNING",
  "ACTION_LEARNING",
  "PROJECT_REPORT",
  "THESIS_REPORT",
  "INTERNSHIP_REPORT",
] as const

export type RecordType = (typeof RECORD_TYPES)[number]

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  CLASSROOM_LEARNING: "Classroom Learning",
  APPLIED_ACTION_LEARNING: "Applied and Action Learning",
  ACTION_LEARNING: "Action Learning",
  PROJECT_REPORT: "Project Report",
  THESIS_REPORT: "Thesis Report",
  INTERNSHIP_REPORT: "Internship Report",
}

export function isRecordType(value: string): value is RecordType {
  return (RECORD_TYPES as readonly string[]).includes(value)
}

export function recordTypeLabel(type: RecordType | string): string {
  return RECORD_TYPE_LABELS[type as RecordType] ?? type
}
