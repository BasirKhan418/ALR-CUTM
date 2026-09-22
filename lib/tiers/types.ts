import type { YearEvalStatus } from "@/lib/domain/tiers"

export type Audience = "dean" | "faculty" | "hod" | "committee" | "mentor"

export type SignoffView = {
  id: string
  role: string
  actorName: string
  at: string | null
  reason: string
}

export type ComponentView = {
  kind: "LR" | "DELIVERABLE"
  id: string
  href: string
  label: string
  detail: string
}

export type CourseCoView = {
  id: string
  code: string
  title: string
  coSigned: boolean
  coSignedBy: string
  coAt: string | null
  coSheet: string
  facultyIds: string[]
}

export type RubricRowView = {
  criterionId: string
  label: string
  max: number
  marks: number | null
  comment: string
}

export type YearDetail = {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  registrationNo: string
  academicYear: string
  campusId: string
  campusName: string
  departmentId: string
  programmeName: string
  durationYears: number
  status: YearEvalStatus
  committeeIds: string[]
  committeeNames: string[]
  components: ComponentView[]
  courses: CourseCoView[]
  rubric: RubricRowView[]
  rubricTotal: number | null
  comments: string
  mentorSigned: boolean
  mentorName: string
  mentorAt: string | null
  mentorSheet: string
  mentorUserIds: string[]
  creditPosted: boolean
  exportStatus: string
  signoffs: SignoffView[]
}

export type YearFlags = {
  canScore: boolean
  canSign: boolean
  canExport: boolean
  canPostCredit: boolean
  canSignPo: boolean
  canEditCommittee: boolean
  coCourseIds: string[]
}

export type YearBoardRow = {
  studentId: string
  studentName: string
  registrationNo: string
  programmeName: string
  durationYears: number | null
  evaluationId: string | null
  status: YearEvalStatus | null
  rubricTotal: number | null
  creditPosted: boolean
  exportStatus: string
}

export type YearQueueRow = {
  id: string
  studentName: string
  academicYear: string
  status: YearEvalStatus
  rubricTotal: number | null
  mentorSigned: boolean
  coSigned: number
  coTotal: number
  href: string
}

export type ProgramYearRow = {
  id: string
  academicYear: string
  status: YearEvalStatus
  rubricTotal: number | null
  creditPosted: boolean
}

export type ProgramDetail = {
  id: string
  studentId: string
  studentName: string
  registrationNo: string
  academicYearsLabel: string
  campusId: string
  campusName: string
  programmeName: string
  durationYears: number
  status: YearEvalStatus
  committeeIds: string[]
  committeeNames: string[]
  years: ProgramYearRow[]
  yearTotals: number[]
  formula: string
  cumulatedMark: number | null
  finalMark: number | null
  scaleUsed: number | null
  rubric: RubricRowView[]
  rubricTotal: number | null
  comments: string
  exportStatus: string
  creditsPosted: number
  signoffs: SignoffView[]
}

export type ProgramFlags = {
  canCumulate: boolean
  canScore: boolean
  canSign: boolean
  canExport: boolean
  canEditCommittee: boolean
}

export type ProgramBoardRow = {
  studentId: string
  studentName: string
  registrationNo: string
  programmeName: string
  durationYears: number
  signedYears: number
  yearTotals: number[]
  formula: string
  cumulatedPreview: number
  evaluationId: string | null
  status: YearEvalStatus | null
  cumulatedMark: number | null
  finalMark: number | null
}

export type CreditRowView = {
  academicYear: string
  credits: number
  postedAt: string
  exportStatus: string
}

export type StudentCreditsView = {
  basket: string
  posted: number
  expected: number | null
  label: string
  programmeName: string
  rows: CreditRowView[]
}

export type PersonOption = { id: string; name: string; email: string }
