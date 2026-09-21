import type { LrEntryDoc } from "@/lib/db/models/lr-entry"
import type { LrEntryView } from "@/lib/lr/types"

function isoDate(value?: Date | null) {
  if (!value) return ""
  return value.toISOString().slice(0, 10)
}

function text(value?: string | null) {
  return value ?? ""
}

function numberText(value?: number | null) {
  return value === undefined || value === null || Number.isNaN(value)
    ? ""
    : String(value)
}

export function toLrEntryView(
  entry: LrEntryDoc & { _id: { toString(): string } }
): LrEntryView {
  return {
    id: String(entry._id),
    campusId: String(entry.campusId),
    studentId: String(entry.studentId),
    courseId: String(entry.courseId),
    termId: String(entry.termId),
    recordType: entry.recordType,
    status: entry.status,
    submittedAt: entry.submittedAt ? entry.submittedAt.toISOString() : null,
    sessionDate: isoDate(entry.sessionDate),
    topic: text(entry.topic),
    reflection: text(entry.reflection),
    hours: numberText(entry.hours),
    experimentNo: numberText(entry.experimentNo),
    title: text(entry.title),
    concept: text(entry.concept),
    planning: text(entry.planning),
    result: text(entry.result),
    recordNotes: text(entry.recordNotes),
    vivaNotes: text(entry.vivaNotes),
    taskTitle: text(entry.taskTitle),
    criticalThinking: text(entry.criticalThinking),
    hoursContributed: numberText(entry.hoursContributed),
    booksManuals: text(entry.booksManuals),
    createdAt: entry.createdAt.toISOString(),
  }
}
