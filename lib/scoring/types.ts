import type { RecordType } from "@/lib/domain/record-types"
import type { CourseRecordConfig } from "@/lib/domain/catalog"
import type { ClassroomCompositeWeights } from "@/lib/domain/weights"
import type { LrEntryView } from "@/lib/lr/types"

export type SubjectScoreView = {
  studentId: string
  courseId: string
  recordType: RecordType
  rawAverage: number
  entryMax: number
  frameworkMarks: number
  normalized: number
  formulaId: "scale_average" | "classroom_composites"
  formulaText: string
  weightPercent: number
  computedAt: string
  overrideReason: string | null
}

export type ClassroomComponentsView = {
  studentId: string
  assignment: number
  presentation: number
  midSem: number
  recordMark: number
  source: "MANUAL"
  updatedAt: string
}

export type GradebookRow = {
  studentId: string
  studentName: string
  studentEmail: string
  cells: SubjectScoreView[]
}

export type AiScoreStatusView = {
  runId: string
  status: "QUEUED" | "DONE" | "FAILED"
  percent: number
  suggestedScores: Record<string, number> | null
  message?: string
}

export type ScoreableEntry = LrEntryView & {
  studentName: string
  studentEmail: string
  courseCode: string
  courseTitle: string
  facultyScores: Record<string, number>
  facultyRemarks: string
  scoredAt: string | null
  overrideReason: string | null
  latestAi: AiScoreStatusView | null
  recordConfig: CourseRecordConfig | null
  compositeWeights: ClassroomCompositeWeights | null
}
