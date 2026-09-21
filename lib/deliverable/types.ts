import type { DeliverableStatus, DeliverableType } from "@/lib/domain/deliverable"
import type { PlagiarismReportView } from "@/lib/plagiarism/types"
import type { PublicationStatus } from "@/lib/db/models/paper-publication"
import type { Role } from "@/lib/domain/roles"
import type { SignoffDecision } from "@/lib/domain/signoff"

export type FileView = {
  id: string
  originalName: string
  kind: string
  byteSize: number
}

export type CandidateView = {
  id: string
  name: string
  email: string
  registrationNo: string
}

export type SignoffView = {
  id: string
  stepOrder: number
  role: Role
  actorId: string | null
  actorName: string | null
  decision: SignoffDecision
  reason: string
  at: string | null
}

export type PublicationView = {
  id: string
  title: string
  venue: string
  status: PublicationStatus
  proof: FileView | null
  steps: SignoffView[]
}

export type DeliverableView = {
  id: string
  campusId: string
  departmentId: string
  programmeId: string
  courseId: string
  courseCode: string
  courseTitle: string
  termId: string
  type: DeliverableType
  title: string
  branch: string
  specialization: string
  status: DeliverableStatus
  candidates: CandidateView[]
  supervisorId: string
  supervisorName: string
  coSupervisorId: string
  coSupervisorName: string
  industrySupervisor: { name: string; email: string; org: string }
  word: FileView | null
  pdf: FileView | null
  internScores: { internal: number | null; external: number | null; total: number | null }
  rubricTotal: number | null
  rubricRemarks: string
  coAttainment: { code: string; statement: string; level: string; remarks: string }[]
  steps: SignoffView[]
  currentStep: SignoffView | null
  publication: PublicationView | null
  industryTokenUrl: string | null
  lastReturnReason: string
  report: PlagiarismReportView | null
}

export type DeliverableQueueItem = {
  id: string
  title: string
  type: DeliverableType
  status: DeliverableStatus
  courseCode: string
  courseTitle: string
  candidateNames: string
  waitingOn: string
  waitingKind: "DELIVERABLE" | "PUBLICATION"
  updatedAt: string
}

export type StaffOption = {
  id: string
  name: string
  email: string
  roles: string[]
}

export type EnrolledStudentOption = {
  id: string
  name: string
  email: string
  registrationNo: string
}
