import type {
  PlagiarismCaseStatus,
  PlagiarismDocumentType,
  PlagiarismExclusion,
  PlagiarismMatch,
  PlagiarismReportStatus,
  PlagiarismTargetType,
  PlagiarismTool,
} from "@/lib/domain/plagiarism"

export type PlagiarismReportView = {
  id: string
  targetType: PlagiarismTargetType
  targetId: string
  deliverableId: string | null
  courseId: string | null
  documentType: PlagiarismDocumentType
  tool: PlagiarismTool
  jobName: string
  score: number | null
  rawScore: number | null
  thresholdApplied: number
  status: PlagiarismReportStatus
  matches: PlagiarismMatch[]
  exclusions: PlagiarismExclusion[]
  caseId: string | null
}

export type PlagiarismCaseView = {
  id: string
  report: PlagiarismReportView
  courseCode: string
  title: string
  studentNames: string
  studentIds: string[]
  committeeMemberIds: string[]
  committeeNames: string[]
  guideIds: string[]
  status: PlagiarismCaseStatus
  responseDueAt: string
  responseExpired: boolean
  studentResponse: string
  recommendation: string
  canRespond: boolean
  canRecommend: boolean
  canAssign: boolean
  canDecide: boolean
}

export type PlagiarismCaseQueueItem = {
  id: string
  title: string
  courseCode: string
  studentNames: string
  status: PlagiarismCaseStatus
  responseDueAt: string
  responseExpired: boolean
}

export type ProgrammingUploadView = {
  id: string
  fileName: string
  fileId: string
  report: PlagiarismReportView | null
}
