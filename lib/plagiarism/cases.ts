import { Types } from "mongoose"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { PlagiarismCase } from "@/lib/db/models/plagiarism-case"
import { PlagiarismReport } from "@/lib/db/models/plagiarism-report"
import { ProgrammingUpload } from "@/lib/db/models/programming-upload"
import { connectMongo } from "@/lib/db/mongo"
import { PLAGIARISM_CASE_RESPONSE_DAYS } from "@/lib/domain/plagiarism"
import type { DeliverableStatus } from "@/lib/domain/deliverable"

export async function openCaseIfNeeded(
  reportId: string,
  options: { reopenIfClosed?: boolean } = {}
) {
  await connectMongo()
  const report = await PlagiarismReport.findById(reportId)
  if (!report || report.status !== "FLAGGED") return null
  const existing = await PlagiarismCase.findOne({
    reportId: report._id,
    status: { $in: ["OPEN", "STUDENT_RESPONDED", "COMMITTEE_RECOMMENDED"] },
  })
  if (existing) return existing
  const closed = await PlagiarismCase.findOne({ reportId: report._id }).sort({
    createdAt: -1,
  })
  if (closed && !options.reopenIfClosed) return closed

  let studentIds: Types.ObjectId[] = []
  let statusBeforeCase: DeliverableStatus | undefined
  if (report.targetType === "MAJOR_DELIVERABLE" || report.deliverableId) {
    const deliverable = await MajorDeliverable.findById(
      report.deliverableId ?? report.targetId
    )
    if (deliverable) {
      studentIds = deliverable.candidateIds
      statusBeforeCase = deliverable.status
      if (deliverable.status !== "UNDER_COMMITTEE_REVIEW") {
        deliverable.status = "UNDER_COMMITTEE_REVIEW"
        await deliverable.save()
      }
    }
  } else if (report.targetType === "LR_ENTRY") {
    const entry = await LrEntry.findById(report.targetId)
    if (entry) studentIds = [entry.studentId]
  } else if (report.targetType === "PROGRAMMING_UPLOAD") {
    const upload = await ProgrammingUpload.findById(report.targetId)
    if (upload) studentIds = [upload.studentId]
  }

  return PlagiarismCase.create({
    campusId: report.campusId,
    reportId: report._id,
    targetType: report.targetType,
    targetId: report.targetId,
    deliverableId: report.deliverableId,
    courseId: report.courseId,
    studentIds,
    committeeMemberIds: [],
    responseDueAt: new Date(
      Date.now() + PLAGIARISM_CASE_RESPONSE_DAYS * 24 * 60 * 60 * 1000
    ),
    responseExpired: false,
    status: "OPEN",
    statusBeforeCase,
  })
}

export async function restoreDeliverableFromCase(caseId: string) {
  const row = await PlagiarismCase.findById(caseId)
  if (!row?.deliverableId || !row.statusBeforeCase) return
  await MajorDeliverable.updateOne(
    { _id: row.deliverableId, status: "UNDER_COMMITTEE_REVIEW" },
    { $set: { status: row.statusBeforeCase } }
  )
}

export async function guideIdsForStudents(studentIds: string[], courseId?: string) {
  await connectMongo()
  const filter: Record<string, unknown> = {
    candidateIds: { $in: studentIds },
  }
  if (courseId) filter.courseId = courseId
  const rows = await MajorDeliverable.find(filter)
    .select("supervisorId coSupervisorId")
    .lean()
  const ids = new Set<string>()
  for (const row of rows) {
    if (row.supervisorId) ids.add(String(row.supervisorId))
    if (row.coSupervisorId) ids.add(String(row.coSupervisorId))
  }
  return ids
}
