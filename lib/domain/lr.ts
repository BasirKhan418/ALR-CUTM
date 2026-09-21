import {
  recordTypeLabel,
  type RecordType,
} from "@/lib/domain/record-types"

export const LR_ENTRY_STATUSES = ["DRAFT", "SUBMITTED"] as const
export type LrEntryStatus = (typeof LR_ENTRY_STATUSES)[number]

export const LIVE_LR_RECORD_TYPES = [
  "CLASSROOM_LEARNING",
  "APPLIED_ACTION_LEARNING",
  "ACTION_LEARNING",
] as const

export type LiveLrRecordType = (typeof LIVE_LR_RECORD_TYPES)[number]

export const STUB_LR_RECORD_TYPES = [
  "PROJECT_REPORT",
  "THESIS_REPORT",
  "INTERNSHIP_REPORT",
] as const

export type StubLrRecordType = (typeof STUB_LR_RECORD_TYPES)[number]

export function isLiveLrRecordType(
  value: string
): value is LiveLrRecordType {
  return (LIVE_LR_RECORD_TYPES as readonly string[]).includes(value)
}

export function isStubLrRecordType(
  value: string
): value is StubLrRecordType {
  return (STUB_LR_RECORD_TYPES as readonly string[]).includes(value)
}

export function missingRecordTypeMessage(recordType: RecordType | string) {
  return `This subject does not require ${recordTypeLabel(recordType)}.`
}

export function stubRecordMessage(recordType: RecordType | string) {
  return `${recordTypeLabel(recordType)} opens in M05. This subject requires it, but the deliverable form is not open yet.`
}

const REQUIRED_BY_TYPE: Record<LiveLrRecordType, readonly string[]> = {
  CLASSROOM_LEARNING: ["sessionDate", "topic", "reflection", "booksManuals"],
  APPLIED_ACTION_LEARNING: [
    "experimentNo",
    "title",
    "concept",
    "planning",
    "result",
    "recordNotes",
    "vivaNotes",
    "booksManuals",
  ],
  ACTION_LEARNING: [
    "taskTitle",
    "criticalThinking",
    "hoursContributed",
    "booksManuals",
  ],
}

export type LrNarrativeFields = {
  sessionDate?: string
  topic?: string
  reflection?: string
  hours?: string
  experimentNo?: string
  title?: string
  concept?: string
  planning?: string
  result?: string
  recordNotes?: string
  vivaNotes?: string
  taskTitle?: string
  criticalThinking?: string
  hoursContributed?: string
  booksManuals?: string
}

export function requiredFieldsFor(recordType: LiveLrRecordType) {
  return REQUIRED_BY_TYPE[recordType]
}

export function validateLrSubmit(
  recordType: LiveLrRecordType,
  fields: LrNarrativeFields
): string | null {
  for (const key of REQUIRED_BY_TYPE[recordType]) {
    const value = fields[key as keyof LrNarrativeFields]?.trim() ?? ""
    if (!value) {
      if (key === "booksManuals") {
        return "Books/Manuals Referred is required. Write None if you did not use any."
      }
      return "Fill every narrative field before you submit."
    }
  }
  if (recordType === "CLASSROOM_LEARNING") {
    if (!fields.sessionDate || Number.isNaN(new Date(fields.sessionDate).getTime())) {
      return "Enter a valid session date."
    }
    if (fields.hours?.trim()) {
      const hours = Number(fields.hours)
      if (!Number.isFinite(hours) || hours < 0) {
        return "Hours must be a number of 0 or more."
      }
    }
  }
  if (recordType === "APPLIED_ACTION_LEARNING") {
    const experimentNo = Number(fields.experimentNo)
    if (!Number.isFinite(experimentNo) || experimentNo <= 0) {
      return "Experiment number must be a positive number."
    }
  }
  if (recordType === "ACTION_LEARNING") {
    const hours = Number(fields.hoursContributed)
    if (!Number.isFinite(hours) || hours <= 0) {
      return "Hours contributed must be a number greater than 0."
    }
  }
  return null
}
