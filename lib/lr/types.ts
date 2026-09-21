import type { LrEntryStatus } from "@/lib/domain/lr"
import type { RecordType } from "@/lib/domain/record-types"

export type LrEntryView = {
  id: string
  campusId: string
  studentId: string
  courseId: string
  termId: string
  recordType: RecordType
  status: LrEntryStatus
  submittedAt: string | null
  sessionDate: string
  topic: string
  reflection: string
  hours: string
  experimentNo: string
  title: string
  concept: string
  planning: string
  result: string
  recordNotes: string
  vivaNotes: string
  taskTitle: string
  criticalThinking: string
  hoursContributed: string
  booksManuals: string
  createdAt: string
}

export type InboxCriterionMark = {
  key: string
  label: string
  value: number
  max: number
}

export type FacultyInboxItem = LrEntryView & {
  studentName: string
  studentEmail: string
  courseCode: string
  courseTitle: string
  termName: string
  scored: boolean
  scoredAt: string | null
  facultyScores: Record<string, number>
  facultyRemarks: string
  entryTotal: number | null
  entryMax: number | null
  criterionMarks: InboxCriterionMark[]
  subjectNormalized: number | null
  subjectFramework: number | null
}

export type WorkshopCertificateData = {
  studentName: string
  studentEmail: string
  courseCode: string
  courseTitle: string
  termName: string
  academicYear: string
  totalHours: number
  tasks: { title: string; hours: number; status: LrEntryStatus }[]
}
