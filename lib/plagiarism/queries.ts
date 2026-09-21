import { Types } from "mongoose"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { Course } from "@/lib/db/models/course"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { PlagiarismCase } from "@/lib/db/models/plagiarism-case"
import { PlagiarismReport } from "@/lib/db/models/plagiarism-report"
import { ProgrammingUpload } from "@/lib/db/models/programming-upload"
import { StoredFile } from "@/lib/db/models/file"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import { canRecommendOnCase, canRespondToCase } from "@/lib/domain/plagiarism"
import { guideIdsForStudents } from "@/lib/plagiarism/cases"
import type {
  PlagiarismCaseQueueItem,
  PlagiarismCaseView,
  PlagiarismReportView,
  ProgrammingUploadView,
} from "@/lib/plagiarism/types"

function reportView(row: {
  _id: { toString(): string }
  targetType: PlagiarismReportView["targetType"]
  targetId: { toString(): string }
  deliverableId?: { toString(): string }
  courseId?: { toString(): string }
  documentType: PlagiarismReportView["documentType"]
  tool: PlagiarismReportView["tool"]
  jobName: string
  score?: number
  rawScore?: number
  thresholdApplied: number
  status: PlagiarismReportView["status"]
  matches?: PlagiarismReportView["matches"]
  exclusions?: {
    matchId: string
    reason: string
    certificateFileId?: { toString(): string }
    bySupervisorId: { toString(): string }
    at: Date
  }[]
}): PlagiarismReportView {
  return {
    id: String(row._id),
    targetType: row.targetType,
    targetId: String(row.targetId),
    deliverableId: row.deliverableId ? String(row.deliverableId) : null,
    courseId: row.courseId ? String(row.courseId) : null,
    documentType: row.documentType,
    tool: row.tool,
    jobName: row.jobName,
    score: row.score ?? null,
    rawScore: row.rawScore ?? null,
    thresholdApplied: row.thresholdApplied,
    status: row.status,
    matches: (row.matches ?? []).map(
      (item: {
        id: string
        sourceLabel: string
        sourceTargetId?: string
        overlap: number
        excerpt?: string
      }) => ({
        id: item.id,
        sourceLabel: item.sourceLabel,
        sourceTargetId: item.sourceTargetId,
        overlap: item.overlap,
        excerpt: item.excerpt,
      })
    ),
    exclusions: (row.exclusions ?? []).map((item) => ({
      matchId: item.matchId,
      reason: item.reason,
      certificateFileId: item.certificateFileId
        ? String(item.certificateFileId)
        : undefined,
      bySupervisorId: String(item.bySupervisorId),
      at: item.at.toISOString(),
    })),
    caseId: null,
  }
}

async function withCaseId(view: PlagiarismReportView): Promise<PlagiarismReportView> {
  const open = await PlagiarismCase.findOne({
    reportId: view.id,
    status: { $in: ["OPEN", "STUDENT_RESPONDED", "COMMITTEE_RECOMMENDED"] },
  })
    .select("_id")
    .lean()
  return { ...view, caseId: open ? String(open._id) : null }
}

export async function loadReportForTarget(
  targetType: PlagiarismReportView["targetType"],
  targetId: string
) {
  await connectMongo()
  const row = await PlagiarismReport.findOne({ targetType, targetId }).lean()
  return row ? withCaseId(reportView(row)) : null
}

export async function loadCommitteeStaff(campusId: string) {
  await connectMongo()
  const users = await User.find({
    campusId,
    active: true,
    roles: { $in: ["FACULTY", "MENTOR", "HOD", "DEAN", "COMMITTEE_MEMBER"] },
  })
    .sort({ name: 1 })
    .lean()
  return users.map((user) => ({
    id: String(user._id),
    name: user.name,
    roles: user.roles as string[],
  }))
}

export async function loadProgrammingUpload(
  studentId: string,
  courseId: string
): Promise<ProgrammingUploadView | null> {
  await connectMongo()
  const row = await ProgrammingUpload.findOne({ studentId, courseId }).lean()
  if (!row) return null
  const [file, report] = await Promise.all([
    StoredFile.findById(row.zipFileId).lean(),
    loadReportForTarget("PROGRAMMING_UPLOAD", String(row._id)),
  ])
  return {
    id: String(row._id),
    fileName: file?.originalName ?? "upload.zip",
    fileId: String(row.zipFileId),
    report,
  }
}

export async function loadCaseQueue(input: {
  campusId: string
  studentId?: string
  committeeId?: string
}): Promise<PlagiarismCaseQueueItem[]> {
  await connectMongo()
  const filter: Record<string, unknown> = { campusId: input.campusId }
  if (input.studentId) filter.studentIds = input.studentId
  if (input.committeeId) filter.committeeMemberIds = input.committeeId
  const rows = await PlagiarismCase.find(filter).sort({ updatedAt: -1 }).lean()
  const reports = await PlagiarismReport.find({
    _id: { $in: rows.map((row) => row.reportId) },
  }).lean()
  const reportById = new Map(reports.map((row) => [String(row._id), row]))
  const courses = await Course.find({
    _id: { $in: rows.map((row) => row.courseId).filter(Boolean) },
  }).lean()
  const courseById = new Map(courses.map((row) => [String(row._id), row]))
  const students = await User.find({
    _id: { $in: rows.flatMap((row) => row.studentIds) },
  }).lean()
  const nameById = new Map(students.map((row) => [String(row._id), row.name]))
  const deliverables = await MajorDeliverable.find({
    _id: { $in: rows.map((row) => row.deliverableId).filter(Boolean) },
  })
    .select("title")
    .lean()
  const titleById = new Map(deliverables.map((row) => [String(row._id), row.title]))
  return rows.map((row) => {
    const report = reportById.get(String(row.reportId))
    return {
      id: String(row._id),
      title:
        (row.deliverableId && titleById.get(String(row.deliverableId))) ||
        report?.documentType ||
        "Integrity case",
      courseCode: row.courseId
        ? courseById.get(String(row.courseId))?.code ?? "Course"
        : "Course",
      studentNames: row.studentIds
        .map((id: Types.ObjectId) => nameById.get(String(id)) ?? "Student")
        .join(", "),
      status: row.status,
      responseDueAt: row.responseDueAt.toISOString(),
      responseExpired: Boolean(row.responseExpired),
    }
  })
}

export async function loadCaseView(
  id: string,
  session: {
    userId: string
    roles: readonly string[]
    campusId: string
  }
): Promise<PlagiarismCaseView | null> {
  await connectMongo()
  const row = await PlagiarismCase.findById(id).lean()
  if (!row || String(row.campusId) !== session.campusId) return null
  const report = await PlagiarismReport.findById(row.reportId).lean()
  if (!report) return null
  const [students, committee, course, deliverable] = await Promise.all([
    User.find({ _id: { $in: row.studentIds } }).lean(),
    User.find({ _id: { $in: row.committeeMemberIds } }).lean(),
    row.courseId ? Course.findById(row.courseId).lean() : null,
    row.deliverableId ? MajorDeliverable.findById(row.deliverableId).lean() : null,
  ])
  const guideIds = [
    ...(await guideIdsForStudents(
      row.studentIds.map((item: Types.ObjectId) => String(item)),
      row.courseId ? String(row.courseId) : undefined
    )),
  ]
  const isStudent = row.studentIds.some((item: Types.ObjectId) => String(item) === session.userId)
  const isCommittee = row.committeeMemberIds.some(
    (item: Types.ObjectId) => String(item) === session.userId
  )
  const isOffice =
    session.roles.includes("DEAN") || session.roles.includes("ADMIN")
  const isGuide = Boolean(
    deliverable &&
      (String(deliverable.supervisorId) === session.userId ||
        String(deliverable.coSupervisorId) === session.userId)
  )
  const assigned = row.courseId
    ? await FacultyAssignment.findOne({
        courseId: row.courseId,
        userId: session.userId,
        role: "FACULTY",
      })
    : null
  if (!isStudent && !isCommittee && !isOffice && !isGuide && !assigned) return null
  return {
    id: String(row._id),
    report: reportView(report),
    courseCode: course?.code ?? "Course",
    title: deliverable?.title || report.documentType,
    studentNames: students.map((item: { name: string }) => item.name).join(", "),
    studentIds: row.studentIds.map((item: Types.ObjectId) => String(item)),
    committeeMemberIds: row.committeeMemberIds.map((item: Types.ObjectId) => String(item)),
    committeeNames: committee.map((item) => item.name),
    guideIds,
    status: row.status,
    responseDueAt: row.responseDueAt.toISOString(),
    responseExpired: Boolean(row.responseExpired),
    studentResponse: row.studentResponse?.text ?? "",
    recommendation: row.recommendation?.text ?? "",
    canRespond: isStudent && canRespondToCase(row.status, Boolean(row.responseExpired)),
    canRecommend:
      isCommittee && canRecommendOnCase(row.status, Boolean(row.responseExpired)),
    canAssign:
      isOffice &&
      row.status !== "COMMITTEE_RECOMMENDED" &&
      row.status !== "COUNCIL_RATIFIED" &&
      row.status !== "DISMISSED",
    canDecide: isOffice && row.status === "COMMITTEE_RECOMMENDED",
  }
}
