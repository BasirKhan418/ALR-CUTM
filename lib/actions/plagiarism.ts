"use server"

import { Types } from "mongoose"
import { revalidatePath } from "next/cache"
import { hasRole, requireSession } from "@/lib/auth/guards"
import {
  writePlagiarismHourlyCap,
  writePlagiarismThresholds,
} from "@/lib/catalog/settings"
import { AuditLog } from "@/lib/db/models/audit-log"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { PlagiarismCase } from "@/lib/db/models/plagiarism-case"
import {
  PlagiarismReport,
  type PlagiarismExclusionDoc,
  type PlagiarismMatchDoc,
} from "@/lib/db/models/plagiarism-report"
import { ProgrammingUpload } from "@/lib/db/models/programming-upload"
import { Course } from "@/lib/db/models/course"
import { Enrollment } from "@/lib/db/models/enrollment"
import { connectMongo } from "@/lib/db/mongo"
import type { CourseRecordConfig } from "@/lib/domain/catalog"
import {
  CODE_JOB,
  DEFAULT_PLAGIARISM_THRESHOLDS,
  PLAGIARISM_DOCUMENT_TYPES,
  canRecommendOnCase,
  canRespondToCase,
  reportStatusForScore,
  scoreAfterExclusions,
} from "@/lib/domain/plagiarism"
import { User } from "@/lib/db/models/user"
import { saveUploadedFile } from "@/lib/files/store"
import {
  guideIdsForStudents,
  openCaseIfNeeded,
  restoreDeliverableFromCase,
} from "@/lib/plagiarism/cases"
import { enqueuePlagiarismScan } from "@/lib/plagiarism/enqueue"

export type PlagiarismFormState = {
  ok: boolean
  message?: string
}

function objectId(value: string) {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null
}

function invalidateIntegrity(courseId?: string | null, caseId?: string) {
  revalidatePath("/student")
  revalidatePath("/student/cases")
  revalidatePath("/faculty/cases")
  revalidatePath("/dean/cases")
  revalidatePath("/admin/cases")
  revalidatePath("/admin/settings")
  revalidatePath("/admin/health")
  if (courseId) {
    revalidatePath(`/student/courses/${courseId}`)
    revalidatePath(`/faculty/courses/${courseId}`)
  }
  if (caseId) {
    revalidatePath(`/student/cases/${caseId}`)
    revalidatePath(`/faculty/cases/${caseId}`)
    revalidatePath(`/dean/cases/${caseId}`)
    revalidatePath(`/admin/cases/${caseId}`)
  }
}

async function canExclude(userId: string, report: InstanceType<typeof PlagiarismReport>) {
  if (report.deliverableId) {
    const row = await MajorDeliverable.findById(report.deliverableId)
    if (!row) return false
    return (
      String(row.supervisorId) === userId || String(row.coSupervisorId) === userId
    )
  }
  if (report.courseId) {
    const assigned = await FacultyAssignment.findOne({
      courseId: report.courseId,
      userId,
      role: "FACULTY",
    })
    return Boolean(assigned)
  }
  return false
}

export async function excludePlagiarismMatch(
  _prev: PlagiarismFormState,
  formData: FormData
): Promise<PlagiarismFormState> {
  const session = await requireSession()
  const reportId = String(formData.get("reportId") ?? "").trim()
  const matchId = String(formData.get("matchId") ?? "").trim()
  const reason = String(formData.get("reason") ?? "").trim()
  if (!objectId(reportId) || !matchId) {
    return { ok: false, message: "Choose a match to exclude." }
  }
  if (!reason) return { ok: false, message: "A supervisor reason is required." }
  await connectMongo()
  const report = await PlagiarismReport.findById(reportId)
  if (!report) return { ok: false, message: "Report was not found." }
  if (String(report.campusId) !== session.campusId) {
    return { ok: false, message: "Report was not found." }
  }
  if (!(await canExclude(session.userId, report))) {
    return { ok: false, message: "Only the supervisor or assigned faculty can certify an exclusion." }
  }
  if (!report.matches.some((item: PlagiarismMatchDoc) => item.id === matchId)) {
    return { ok: false, message: "That match is not on this report." }
  }
  if (report.exclusions.some((item: PlagiarismExclusionDoc) => item.matchId === matchId)) {
    return { ok: false, message: "That match is already excluded." }
  }
  const file = formData.get("certificate")
  let certificateFileId: Types.ObjectId | undefined
  if (file instanceof File && file.size > 0) {
    const saved = await saveUploadedFile({
      file,
      kind: "PROOF",
      campusId: String(report.campusId),
      uploadedBy: session.userId,
    })
    if (!saved.ok) return { ok: false, message: saved.message }
    certificateFileId = new Types.ObjectId(saved.fileId)
  } else {
    return { ok: false, message: "Upload a certificate PDF with the exclusion." }
  }
  report.exclusions.push({
    matchId,
    reason,
    certificateFileId,
    bySupervisorId: new Types.ObjectId(session.userId),
    at: new Date(),
  })
  const next = scoreAfterExclusions(
    report.matches,
    report.exclusions,
    report.rawScore ?? report.score ?? 0
  )
  const excludedAll = report.exclusions.length === report.matches.length
  report.score = next
  report.status = reportStatusForScore(next, report.thresholdApplied, excludedAll)
  await report.save()
  if (report.status === "FLAGGED") {
    await openCaseIfNeeded(String(report._id), { reopenIfClosed: false })
  } else {
    const open = await PlagiarismCase.find({
      reportId: report._id,
      status: { $in: ["OPEN", "STUDENT_RESPONDED", "COMMITTEE_RECOMMENDED"] },
    })
    for (const item of open) {
      item.status = "DISMISSED"
      await item.save()
      await restoreDeliverableFromCase(String(item._id))
    }
  }
  const related = await PlagiarismCase.find({ reportId: report._id }).select("_id")
  await AuditLog.create({
    actorId: session.userId,
    action: "plagiarism.exclude",
    payload: { reportId, matchId, score: next },
  })
  const courseId = report.courseId ? String(report.courseId) : null
  if (related.length === 0) invalidateIntegrity(courseId)
  for (const item of related) {
    invalidateIntegrity(courseId, String(item._id))
  }
  return {
    ok: true,
    message:
      report.status === "FLAGGED"
        ? "Exclusion saved. The report is still above the threshold."
        : "Exclusion saved. Remaining score is now at or under the threshold.",
  }
}

export async function assignCaseCommittee(
  _prev: PlagiarismFormState,
  formData: FormData
): Promise<PlagiarismFormState> {
  const session = await requireSession()
  if (!hasRole(session, "DEAN") && !hasRole(session, "ADMIN")) {
    return { ok: false, message: "Only Dean or Admin can assign the committee." }
  }
  const caseId = String(formData.get("caseId") ?? "").trim()
  const memberIds = [
    ...new Set(
      formData
        .getAll("memberId")
        .map((value) => String(value))
        .filter((value) => objectId(value))
    ),
  ]
  if (!objectId(caseId)) return { ok: false, message: "Case is required." }
  await connectMongo()
  const row = await PlagiarismCase.findById(caseId)
  if (!row || String(row.campusId) !== session.campusId) {
    return { ok: false, message: "Case was not found." }
  }
  if (row.status === "COMMITTEE_RECOMMENDED" || row.status === "COUNCIL_RATIFIED" || row.status === "DISMISSED") {
    return { ok: false, message: "The committee cannot be changed after a recommendation." }
  }
  if (memberIds.length === 0) {
    return { ok: false, message: "Assign at least one committee member." }
  }
  const staff = await User.find({
    _id: { $in: memberIds },
    campusId: session.campusId,
    active: true,
    roles: { $in: ["FACULTY", "MENTOR", "HOD", "DEAN", "COMMITTEE_MEMBER"] },
  }).select("_id")
  if (staff.length !== memberIds.length) {
    return { ok: false, message: "Every member must be an active staff account on this campus." }
  }
  const guides = await guideIdsForStudents(
    row.studentIds.map((id: Types.ObjectId) => String(id)),
    row.courseId ? String(row.courseId) : undefined
  )
  if (memberIds.some((id) => guides.has(id))) {
    return { ok: false, message: "The student’s supervisor or guide cannot sit on this committee." }
  }
  if (memberIds.some((id) => row.studentIds.some((student: Types.ObjectId) => String(student) === id))) {
    return { ok: false, message: "A candidate cannot sit on their own committee." }
  }
  row.committeeMemberIds = memberIds.map((id) => new Types.ObjectId(id))
  row.assignedBy = new Types.ObjectId(session.userId)
  await row.save()
  await AuditLog.create({
    actorId: session.userId,
    action: "plagiarism.assignCommittee",
    payload: { caseId, memberIds },
  })
  invalidateIntegrity(row.courseId ? String(row.courseId) : null, caseId)
  return { ok: true, message: "Committee saved." }
}

export async function respondToPlagiarismCase(
  _prev: PlagiarismFormState,
  formData: FormData
): Promise<PlagiarismFormState> {
  const session = await requireSession()
  const caseId = String(formData.get("caseId") ?? "").trim()
  const text = String(formData.get("response") ?? "").trim()
  if (!objectId(caseId) || !text) {
    return { ok: false, message: "Write a response before you submit." }
  }
  await connectMongo()
  const row = await PlagiarismCase.findById(caseId)
  if (!row || String(row.campusId) !== session.campusId) {
    return { ok: false, message: "Case was not found." }
  }
  if (!row.studentIds.some((id: Types.ObjectId) => String(id) === session.userId)) {
    return { ok: false, message: "Only a named candidate can respond." }
  }
  if (!canRespondToCase(row.status, Boolean(row.responseExpired))) {
    return {
      ok: false,
      message: row.responseExpired
        ? "The 7-day response window has closed."
        : "This case is no longer waiting for a student response.",
    }
  }
  row.studentResponse = {
    by: new Types.ObjectId(session.userId),
    text,
    at: new Date(),
  }
  row.status = "STUDENT_RESPONDED"
  await row.save()
  await AuditLog.create({
    actorId: session.userId,
    action: "plagiarism.respond",
    payload: { caseId },
  })
  invalidateIntegrity(row.courseId ? String(row.courseId) : null, caseId)
  return { ok: true, message: "Response recorded." }
}

export async function recommendPlagiarismCase(
  _prev: PlagiarismFormState,
  formData: FormData
): Promise<PlagiarismFormState> {
  const session = await requireSession()
  const caseId = String(formData.get("caseId") ?? "").trim()
  const text = String(formData.get("recommendation") ?? "").trim()
  if (!objectId(caseId) || !text) {
    return { ok: false, message: "Write a recommendation." }
  }
  await connectMongo()
  const row = await PlagiarismCase.findById(caseId)
  if (!row || String(row.campusId) !== session.campusId) {
    return { ok: false, message: "Case was not found." }
  }
  if (!row.committeeMemberIds.some((id: Types.ObjectId) => String(id) === session.userId)) {
    return { ok: false, message: "Only an assigned committee member can recommend." }
  }
  if (!canRecommendOnCase(row.status, Boolean(row.responseExpired))) {
    return {
      ok: false,
      message: "Wait for the student response, or for the 7-day window to expire.",
    }
  }
  row.recommendation = {
    by: new Types.ObjectId(session.userId),
    text,
    at: new Date(),
  }
  row.status = "COMMITTEE_RECOMMENDED"
  await row.save()
  await AuditLog.create({
    actorId: session.userId,
    action: "plagiarism.recommend",
    payload: { caseId },
  })
  invalidateIntegrity(row.courseId ? String(row.courseId) : null, caseId)
  return { ok: true, message: "Recommendation recorded." }
}

export async function decidePlagiarismCase(
  _prev: PlagiarismFormState,
  formData: FormData
): Promise<PlagiarismFormState> {
  const session = await requireSession()
  if (!hasRole(session, "DEAN") && !hasRole(session, "ADMIN")) {
    return { ok: false, message: "Only Dean or Admin can close the case." }
  }
  const caseId = String(formData.get("caseId") ?? "").trim()
  const decision = String(formData.get("decision") ?? "").trim()
  if (!objectId(caseId)) return { ok: false, message: "Case is required." }
  if (decision !== "COUNCIL_RATIFIED" && decision !== "DISMISSED") {
    return { ok: false, message: "Choose ratify or dismiss." }
  }
  await connectMongo()
  const row = await PlagiarismCase.findById(caseId)
  if (!row || String(row.campusId) !== session.campusId) {
    return { ok: false, message: "Case was not found." }
  }
  if (row.status !== "COMMITTEE_RECOMMENDED") {
    return { ok: false, message: "The committee must recommend before ratification." }
  }
  row.status = decision
  await row.save()
  await restoreDeliverableFromCase(caseId)
  await AuditLog.create({
    actorId: session.userId,
    action: "plagiarism.decide",
    payload: { caseId, decision },
  })
  invalidateIntegrity(row.courseId ? String(row.courseId) : null, caseId)
  return {
    ok: true,
    message:
      decision === "DISMISSED" ? "Case dismissed." : "Council ratification recorded.",
  }
}

export async function savePlagiarismSettings(
  _prev: PlagiarismFormState,
  formData: FormData
): Promise<PlagiarismFormState> {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return { ok: false, message: "Only Admin can change integrity settings." }
  }
  const thresholds = { ...DEFAULT_PLAGIARISM_THRESHOLDS }
  for (const type of PLAGIARISM_DOCUMENT_TYPES) {
    const value = Number(formData.get(type) ?? "")
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return { ok: false, message: `${type} must be between 0 and 100.` }
    }
    thresholds[type] = value
  }
  const cap = Number(formData.get("hourlyCap") ?? "")
  if (!Number.isFinite(cap) || cap < 1) {
    return { ok: false, message: "Hourly cap must be at least 1." }
  }
  await writePlagiarismThresholds(thresholds)
  await writePlagiarismHourlyCap(cap)
  await AuditLog.create({
    actorId: session.userId,
    action: "plagiarism.settings",
    payload: { cap },
  })
  revalidatePath("/admin/settings")
  revalidatePath("/admin/health")
  return { ok: true, message: "Integrity settings saved. Thesis stays configurable from 20." }
}

export async function uploadProgrammingZip(
  _prev: PlagiarismFormState,
  formData: FormData
): Promise<PlagiarismFormState> {
  const session = await requireSession()
  if (!hasRole(session, "STUDENT")) {
    return { ok: false, message: "Only students can upload programming practice." }
  }
  const courseId = String(formData.get("courseId") ?? "").trim()
  if (!objectId(courseId)) return { ok: false, message: "Course is required." }
  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false, message: "Choose a zip file." }
  await connectMongo()
  const enrolled = await Enrollment.findOne({
    studentId: session.userId,
    courseId,
  })
  if (!enrolled) return { ok: false, message: "You are not enrolled in this course." }
  const course = await Course.findById(courseId)
  if (!course) return { ok: false, message: "Course was not found." }
  if (String(course.campusId) !== session.campusId) {
    return { ok: false, message: "Course was not found." }
  }
  if (
    !course.recordConfigs.some(
      (config: CourseRecordConfig) => config.recordType === "APPLIED_ACTION_LEARNING"
    )
  ) {
    return { ok: false, message: "Programming Practice is only on Applied / Practice subjects." }
  }
  const saved = await saveUploadedFile({
    file,
    kind: "ZIP",
    campusId: String(course.campusId),
    uploadedBy: session.userId,
  })
  if (!saved.ok) return { ok: false, message: saved.message }
  const row = await ProgrammingUpload.findOneAndUpdate(
    { studentId: session.userId, courseId },
    {
      $set: {
        campusId: course.campusId,
        studentId: session.userId,
        courseId,
        termId: course.termId,
        zipFileId: saved.fileId,
      },
    },
    { upsert: true, returnDocument: "after" }
  )
  if (!row) return { ok: false, message: "Could not save the programming upload." }
  await enqueuePlagiarismScan({
    campusId: String(course.campusId),
    targetType: "PROGRAMMING_UPLOAD",
    targetId: String(row._id),
    documentType: "PROGRAMMING",
    job: CODE_JOB,
    courseId,
    termId: String(course.termId),
    actorId: session.userId,
  })
  invalidateIntegrity(courseId)
  return { ok: true, message: "Zip saved. Code similarity is queued — not the prose engine." }
}

