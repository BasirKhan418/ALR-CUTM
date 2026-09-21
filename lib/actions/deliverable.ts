"use server"

import { Types } from "mongoose"
import { revalidatePath } from "next/cache"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { getEnv } from "@/lib/config/env"
import { AuditLog } from "@/lib/db/models/audit-log"
import { Course } from "@/lib/db/models/course"
import type { CourseRecordConfig } from "@/lib/domain/catalog"
import { Enrollment } from "@/lib/db/models/enrollment"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { IndustryToken } from "@/lib/db/models/industry-token"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { PaperPublication } from "@/lib/db/models/paper-publication"
import { enqueuePlagiarismScan } from "@/lib/plagiarism/enqueue"
import { PROSE_JOB } from "@/lib/domain/plagiarism"
import { Signoff } from "@/lib/db/models/signoff"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import {
  allowedDeliverableTypes,
  canEditDeliverable,
  defaultDeliverableType,
  isDeliverableType,
  MAX_CANDIDATES,
  recordTypeForDeliverable,
} from "@/lib/domain/deliverable"
import {
  internshipReportTotal,
  validateInternshipHalf,
} from "@/lib/domain/internship"
import type { RecordType } from "@/lib/domain/record-types"
import type { Role } from "@/lib/domain/roles"
import {
  buildDeliverableChain,
  buildPublicationChain,
  type SignoffDecision,
} from "@/lib/domain/signoff"
import {
  currentPendingStep,
  departmentHasHod,
  loadCoverMeta,
  snapshotCandidates,
} from "@/lib/deliverable/queries"
import { hashToken, newRawToken, saveUploadedFile } from "@/lib/files/store"
import { notifyQueue } from "@/lib/queue/queues"
import { recomputeSubjectScore } from "@/lib/scoring/recompute"
import { withSignoffLock } from "@/lib/signoff/lock"
import { readyValkey } from "@/lib/valkey"

export type DeliverableFormState = {
  ok: boolean
  message?: string
  id?: string
  tokenUrl?: string
}

function objectId(value: string) {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null
}

function invalidateDeliverable(courseId: string, id?: string) {
  revalidatePath("/student")
  revalidatePath(`/student/courses/${courseId}`)
  revalidatePath(`/faculty/courses/${courseId}`)
  revalidatePath("/faculty")
  revalidatePath("/supervisor")
  revalidatePath("/hod")
  revalidatePath("/dean")
  if (id) {
    revalidatePath(`/supervisor/${id}`)
    revalidatePath(`/hod/${id}`)
    revalidatePath(`/dean/${id}`)
    revalidatePath(`/faculty/deliverables/${id}`)
  }
}

async function notifySignoff(input: {
  to: string
  kind: string
  deliverableId: string
  courseId: string
}) {
  try {
    await notifyQueue().add("notify.email", {
      kind: input.kind,
      to: input.to,
      recordType: "MAJOR_DELIVERABLE",
      courseId: input.courseId,
      deliverableId: input.deliverableId,
    })
  } catch (error) {
    console.error("[notify] sign-off queue failed", error)
  }
}

async function requireCandidate(deliverableId: string) {
  const session = await requireSession()
  if (!hasRole(session, "STUDENT")) {
    return { session: null as null, row: null, error: "Only candidates can edit this record." }
  }
  await connectMongo()
  const row = await MajorDeliverable.findById(deliverableId)
  if (!row) return { session: null, row: null, error: "Deliverable was not found." }
  if (!row.candidateIds.some((id: Types.ObjectId) => String(id) === session.userId)) {
    return { session: null, row: null, error: "Only candidates on this record can edit it." }
  }
  return { session, row, error: null }
}

async function nextStepOrder(targetType: "MAJOR_DELIVERABLE" | "PAPER_PUBLICATION", targetId: string) {
  const last = await Signoff.findOne({ targetType, targetId }).sort({ stepOrder: -1 }).lean()
  return (last?.stepOrder ?? 0) + 1
}

async function appendChain(input: {
  campusId: string
  targetType: "MAJOR_DELIVERABLE" | "PAPER_PUBLICATION"
  targetId: string
  studentId: string
  hasCoSupervisor: boolean
  hasHod: boolean
}) {
  const start = await nextStepOrder(input.targetType, input.targetId)
  const defs =
    input.targetType === "PAPER_PUBLICATION"
      ? buildPublicationChain(input)
      : buildDeliverableChain(input)
  const docs = defs.map((def, index) => ({
    campusId: input.campusId,
    targetType: input.targetType,
    targetId: input.targetId,
    stepOrder: start + index,
    role: def.role,
    actorId: def.role === "STUDENT" ? input.studentId : undefined,
    decision: def.role === "STUDENT" ? "APPROVED" : "PENDING",
    at: def.role === "STUDENT" ? new Date() : undefined,
  }))
  await Signoff.insertMany(docs)
}

async function requireGuide(
  userId: string | null,
  campusId: string,
  label: string,
  candidateIds: string[]
) {
  if (!userId) return null
  if (candidateIds.includes(userId)) {
    return `${label} cannot also be a candidate on this record.`
  }
  const user = await User.findOne({
    _id: userId,
    campusId,
    active: true,
    roles: { $in: ["FACULTY", "SUPERVISOR"] },
  })
  if (!user) {
    return `${label} must be active faculty or a supervisor on this campus.`
  }
  return null
}

async function refreshSnapshots(row: InstanceType<typeof MajorDeliverable>) {
  const snaps = await snapshotCandidates(row.candidateIds.map((id: Types.ObjectId) => String(id)))
  row.candidates = snaps.map((item) => ({
    userId: new Types.ObjectId(item.id),
    name: item.name,
    email: item.email,
    registrationNo: item.registrationNo,
  }))
}

export async function upsertDeliverableDraft(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const session = await requireSession()
  if (!hasRole(session, "STUDENT")) {
    return { ok: false, message: "Only students can open a major deliverable." }
  }
  const courseId = String(formData.get("courseId") ?? "").trim()
  const recordType = String(formData.get("recordType") ?? "").trim() as RecordType
  const typeRaw = String(formData.get("type") ?? "").trim()
  if (!objectId(courseId)) return { ok: false, message: "Course is required." }
  const allowed = allowedDeliverableTypes(recordType)
  if (allowed.length === 0) {
    return { ok: false, message: "This subject does not take a major deliverable." }
  }
  const type = isDeliverableType(typeRaw)
    ? typeRaw
    : defaultDeliverableType(recordType)
  if (!type || !allowed.includes(type)) {
    return { ok: false, message: "Choose a valid deliverable type." }
  }

  await connectMongo()
  const enrolled = await Enrollment.findOne({
    studentId: session.userId,
    courseId,
  })
  if (!enrolled) return { ok: false, message: "You are not enrolled in this course." }
  const course = await Course.findById(courseId)
  if (!course) return { ok: false, message: "Course was not found." }
  const needed = recordTypeForDeliverable(type)
  if (!course.recordConfigs.some((config: CourseRecordConfig) => config.recordType === needed)) {
    return { ok: false, message: "This combination does not require that record." }
  }

  const existing = await MajorDeliverable.findOne({
    courseId,
    type: { $in: allowed },
    candidateIds: session.userId,
  })
  const title = String(formData.get("title") ?? "").trim()
  const specialization = String(formData.get("specialization") ?? "").trim()
  const supervisorId = String(formData.get("supervisorId") ?? "").trim()
  const coSupervisorId = String(formData.get("coSupervisorId") ?? "").trim()
  const industry = {
    name: String(formData.get("industryName") ?? "").trim(),
    email: String(formData.get("industryEmail") ?? "").trim(),
    org: String(formData.get("industryOrg") ?? "").trim(),
  }

  if (coSupervisorId && coSupervisorId === supervisorId) {
    return { ok: false, message: "Co-supervisor must be a different person." }
  }
  const candidateIds = existing
    ? existing.candidateIds.map((id: Types.ObjectId) => String(id))
    : [session.userId]
  const supervisorError = await requireGuide(
    objectId(supervisorId) ? supervisorId : null,
    String(course.campusId),
    "Supervisor",
    candidateIds
  )
  if (supervisorError) return { ok: false, message: supervisorError }
  const coError = await requireGuide(
    objectId(coSupervisorId) ? coSupervisorId : null,
    String(course.campusId),
    "Co-supervisor",
    candidateIds
  )
  if (coError) return { ok: false, message: coError }

  if (existing) {
    if (!canEditDeliverable(existing.status)) {
      return { ok: false, message: "This record is locked during sign-off." }
    }
    existing.type = type
    existing.title = title
    existing.specialization = specialization
    existing.supervisorId = objectId(supervisorId) ?? undefined
    existing.coSupervisorId = objectId(coSupervisorId) ?? undefined
    if (!objectId(coSupervisorId)) existing.set("coSupervisorId", undefined)
    if (type === "INTERNSHIP") existing.industrySupervisor = industry
    await refreshSnapshots(existing)
    await existing.save()
    invalidateDeliverable(courseId, String(existing._id))
    return { ok: true, message: "Draft saved.", id: String(existing._id) }
  }

  const cover = await loadCoverMeta(courseId)
  if (!cover) return { ok: false, message: "Course was not found." }
  const snaps = await snapshotCandidates([session.userId])
  const created = await MajorDeliverable.create({
    campusId: cover.campusId,
    departmentId: cover.departmentId,
    programmeId: cover.programmeId,
    courseId,
    termId: cover.termId,
    type,
    title,
    branch: cover.branch,
    specialization,
    candidateIds: [session.userId],
    candidates: snaps.map((item) => ({
      userId: item.id,
      name: item.name,
      email: item.email,
      registrationNo: item.registrationNo,
    })),
    supervisorId: objectId(supervisorId) ?? undefined,
    coSupervisorId: objectId(coSupervisorId) ?? undefined,
    industrySupervisor: type === "INTERNSHIP" ? industry : undefined,
    status: "DRAFT",
    createdBy: session.userId,
  })
  await AuditLog.create({
    actorId: session.userId,
    action: "deliverable.create",
    payload: { id: String(created._id), type },
  })
  invalidateDeliverable(courseId, String(created._id))
  return { ok: true, message: "Draft opened.", id: String(created._id) }
}

export async function addDeliverableCandidate(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const id = String(formData.get("deliverableId") ?? "").trim()
  const studentId = String(formData.get("studentId") ?? "").trim()
  const { session, row, error } = await requireCandidate(id)
  if (!session || !row) return { ok: false, message: error ?? "Not allowed." }
  if (!canEditDeliverable(row.status)) {
    return { ok: false, message: "Team changes are only allowed on a draft or returned record." }
  }
  if (row.candidateIds.length >= MAX_CANDIDATES) {
    return { ok: false, message: "A record can list at most three candidates." }
  }
  if (!objectId(studentId)) return { ok: false, message: "Choose a teammate." }
  if (row.candidateIds.some((item: Types.ObjectId) => String(item) === studentId)) {
    return { ok: false, message: "That student is already on this record." }
  }
  const enrolled = await Enrollment.findOne({
    studentId,
    courseId: row.courseId,
  })
  if (!enrolled) {
    return { ok: false, message: "Teammates must be enrolled in this course." }
  }
  if (
    studentId === String(row.supervisorId ?? "") ||
    studentId === String(row.coSupervisorId ?? "")
  ) {
    return { ok: false, message: "A supervisor cannot also be a candidate." }
  }
  const clash = await MajorDeliverable.findOne({
    _id: { $ne: row._id },
    courseId: row.courseId,
    type: row.type,
    candidateIds: studentId,
  })
  if (clash) {
    return { ok: false, message: "That student already has a record of this type on this course." }
  }
  row.candidateIds.push(new Types.ObjectId(studentId))
  await refreshSnapshots(row)
  await row.save()
  invalidateDeliverable(String(row.courseId), id)
  return { ok: true, message: "Candidate added. This is still one shared record." }
}

export async function removeDeliverableCandidate(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const id = String(formData.get("deliverableId") ?? "").trim()
  const studentId = String(formData.get("studentId") ?? "").trim()
  const { session, row, error } = await requireCandidate(id)
  if (!session || !row) return { ok: false, message: error ?? "Not allowed." }
  if (!canEditDeliverable(row.status)) {
    return { ok: false, message: "Team changes are only allowed on a draft or returned record." }
  }
  if (row.candidateIds.length <= 1) {
    return { ok: false, message: "One candidate must stay on the record." }
  }
  row.candidateIds = row.candidateIds.filter((item: Types.ObjectId) => String(item) !== studentId)
  await refreshSnapshots(row)
  await row.save()
  invalidateDeliverable(String(row.courseId), id)
  return { ok: true, message: "Candidate removed." }
}

export async function uploadDeliverableFile(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const id = String(formData.get("deliverableId") ?? "").trim()
  const kind = String(formData.get("kind") ?? "").trim()
  const { session, row, error } = await requireCandidate(id)
  if (!session || !row) return { ok: false, message: error ?? "Not allowed." }
  if (!canEditDeliverable(row.status)) {
    return { ok: false, message: "Files can only change on a draft or returned record." }
  }
  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false, message: "Choose a file." }
  const saved = await saveUploadedFile({
    file,
    kind: kind === "DOCX" ? "DOCX" : "PDF",
    campusId: String(row.campusId),
    uploadedBy: session.userId,
  })
  if (!saved.ok) return { ok: false, message: saved.message }
  if (kind === "DOCX") row.wordFileId = new Types.ObjectId(saved.fileId)
  else row.pdfFileId = new Types.ObjectId(saved.fileId)
  await row.save()
  invalidateDeliverable(String(row.courseId), id)
  return { ok: true, message: kind === "DOCX" ? "Word file saved." : "PDF saved." }
}

async function submitDeliverableRecord(
  row: InstanceType<typeof MajorDeliverable>,
  actorId: string,
  thesisGate: boolean
): Promise<DeliverableFormState> {
  if (!canEditDeliverable(row.status)) {
    return { ok: false, message: "This record cannot be submitted in its current status." }
  }
  if (!row.title?.trim()) return { ok: false, message: "Add a title before you submit." }
  if (!row.supervisorId) return { ok: false, message: "Choose a supervisor before you submit." }
  if (!row.wordFileId || !row.pdfFileId) {
    return { ok: false, message: "Word and PDF are both required before submit." }
  }
  if (row.type === "INTERNSHIP") {
    const org = row.industrySupervisor?.org?.trim()
    const name = row.industrySupervisor?.name?.trim()
    if (!name || !org) {
      return {
        ok: false,
        message: "Add the industry supervisor name and organisation before you submit.",
      }
    }
  }
  if (row.type === "PG_THESIS" && thesisGate) {
    const publication = await PaperPublication.findOne({ deliverableId: row._id })
    if (!publication || publication.status !== "APPROVED") {
      return {
        ok: false,
        message:
          "PG Thesis cannot enter evaluation until the Paper Publication Report is fully approved.",
      }
    }
  }
  const hasHod = await departmentHasHod(String(row.departmentId))
  await appendChain({
    campusId: String(row.campusId),
    targetType: "MAJOR_DELIVERABLE",
    targetId: String(row._id),
    studentId: actorId,
    hasCoSupervisor: Boolean(row.coSupervisorId),
    hasHod,
  })
  row.status = row.type === "PG_THESIS" && thesisGate ? "SUBMITTED_FOR_EVALUATION" : "SUBMITTED"
  await row.save()
  await enqueuePlagiarismScan({
    campusId: String(row.campusId),
    targetType: "MAJOR_DELIVERABLE",
    targetId: String(row._id),
    documentType:
      row.type === "PG_THESIS"
        ? "THESIS"
        : row.type === "INTERNSHIP"
          ? "INTERNSHIP"
          : "PROJECT",
    job: PROSE_JOB,
    deliverableId: String(row._id),
    courseId: String(row.courseId),
    termId: String(row.termId),
    actorId,
  })
  const supervisor = await User.findById(row.supervisorId)
  if (supervisor) {
    await notifySignoff({
      to: supervisor.email,
      kind: "signoff.waiting",
      deliverableId: String(row._id),
      courseId: String(row.courseId),
    })
  }
  await AuditLog.create({
    actorId,
    action: "deliverable.submit",
    payload: { id: String(row._id), status: row.status },
  })
  invalidateDeliverable(String(row.courseId), String(row._id))
  return { ok: true, message: "Submitted. Supervisor is next on the sign-off chain." }
}

export async function submitDeliverable(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const id = String(formData.get("deliverableId") ?? "").trim()
  const { session, row, error } = await requireCandidate(id)
  if (!session || !row) return { ok: false, message: error ?? "Not allowed." }
  if (row.type === "PG_THESIS") {
    return {
      ok: false,
      message: "Use Submit for evaluation after the publication report is approved.",
    }
  }
  return submitDeliverableRecord(row, session.userId, false)
}

export async function submitForEvaluation(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const id = String(formData.get("deliverableId") ?? "").trim()
  const { session, row, error } = await requireCandidate(id)
  if (!session || !row) return { ok: false, message: error ?? "Not allowed." }
  if (row.type !== "PG_THESIS") {
    return { ok: false, message: "Submit for evaluation is only for PG Thesis." }
  }
  return submitDeliverableRecord(row, session.userId, true)
}

export async function decideSignoff(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const session = await requireSession()
  const id = String(formData.get("deliverableId") ?? "").trim()
  const decision = String(formData.get("decision") ?? "").trim() as SignoffDecision
  const reason = String(formData.get("reason") ?? "").trim()
  if (!objectId(id)) return { ok: false, message: "Deliverable is required." }
  if (decision !== "APPROVED" && decision !== "RETURNED" && decision !== "REJECTED") {
    return { ok: false, message: "Choose approve, return, or reject." }
  }
  if (decision !== "APPROVED" && !reason) {
    return { ok: false, message: "A reason is required when you return or reject." }
  }

  const locked = await withSignoffLock(id, async () => {
    await connectMongo()
    const row = await MajorDeliverable.findById(id)
    if (!row) return { ok: false as const, message: "Deliverable was not found." }
    if (row.status === "UNDER_COMMITTEE_REVIEW") {
      return {
        ok: false as const,
        message: "Sign-off is paused while a plagiarism case is open.",
      }
    }
    if (row.status !== "SUBMITTED" && row.status !== "SUBMITTED_FOR_EVALUATION") {
      return { ok: false as const, message: "This record is not waiting on a sign-off decision." }
    }
    const pending = await currentPendingStep("MAJOR_DELIVERABLE", id)
    if (!pending) return { ok: false as const, message: "There is no waiting sign-off step." }
    const allowed = actorMayDecide(session, row, pending.role as Role)
    if (!allowed) {
      return { ok: false as const, message: "It is not your turn on this chain." }
    }

    pending.decision = decision
    pending.reason = reason || undefined
    pending.actorId = new Types.ObjectId(session.userId)
    pending.at = new Date()
    await Signoff.updateOne({ _id: pending._id }, { $set: pending })

    if (decision === "RETURNED" || decision === "REJECTED") {
      await closeRemainingSteps(
        "MAJOR_DELIVERABLE",
        id,
        decision === "RETURNED"
          ? "Chain stopped — record returned to the candidates."
          : "Chain stopped — record was rejected."
      )
      row.status = decision === "RETURNED" ? "RETURNED" : "REJECTED"
      await row.save()
      await notifyCandidates(
        row,
        decision === "RETURNED" ? "signoff.returned" : "signoff.rejected"
      )
    } else {
      const next = await currentPendingStep("MAJOR_DELIVERABLE", id)
      if (!next) {
        row.status =
          row.type === "PG_THESIS" ? "SUBMITTED_FOR_EVALUATION" : "APPROVED"
        await row.save()
        await notifyCandidates(row, "signoff.approved")
      } else {
        await notifyNextActor(row, next.role as Role)
      }
    }

    await AuditLog.create({
      actorId: session.userId,
      action: "deliverable.signoff",
      payload: { id, decision, role: pending.role },
    })
    invalidateDeliverable(String(row.courseId), id)
    return {
      ok: true as const,
      message:
        decision === "APPROVED"
          ? "Decision recorded. The chain moved forward."
          : `Record ${decision.toLowerCase()}. The reason is visible to the candidates.`,
    }
  })
  if (!locked.ok) return { ok: false, message: locked.message }
  return locked.value
}

function actorMayDecide(
  session: {
    userId: string
    roles: Role[]
    campusId: string
    departmentId: string | null
  },
  row: InstanceType<typeof MajorDeliverable>,
  role: Role
) {
  if (String(row.campusId) !== session.campusId) return false
  if (role === "SUPERVISOR") return String(row.supervisorId) === session.userId
  if (role === "CO_SUPERVISOR") return String(row.coSupervisorId) === session.userId
  if (role === "HOD") {
    return (
      session.roles.includes("HOD") &&
      session.departmentId === String(row.departmentId)
    )
  }
  if (role === "DEAN") return session.roles.includes("DEAN")
  return false
}

async function notifyCandidates(
  row: InstanceType<typeof MajorDeliverable>,
  kind: string
) {
  for (const candidate of row.candidates) {
    await notifySignoff({
      to: candidate.email,
      kind,
      deliverableId: String(row._id),
      courseId: String(row.courseId),
    })
  }
}

export async function issueIndustryToken(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const session = await requireSession()
  const id = String(formData.get("deliverableId") ?? "").trim()
  if (!objectId(id)) return { ok: false, message: "Deliverable is required." }
  await connectMongo()
  const row = await MajorDeliverable.findById(id)
  if (!row || row.type !== "INTERNSHIP") {
    return { ok: false, message: "Industry tokens are only for internships." }
  }
  if (integrityPaused(row)) {
    return { ok: false, message: "Scoring is paused while a plagiarism case is open." }
  }
  if (mentorBlocked(session, row)) {
    return { ok: false, message: "Mentors cannot issue industry tokens." }
  }
  if (!(await canManageDeliverable(session.userId, row))) {
    return { ok: false, message: "Only the supervisor or assigned faculty can issue a token." }
  }
  const raw = newRawToken()
  const tokenHash = hashToken(raw)
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  await IndustryToken.create({
    campusId: row.campusId,
    deliverableId: row._id,
    tokenHash,
    issuedBy: session.userId,
    expiresAt,
  })
  const valkey = await readyValkey()
  await valkey.set(`token:industry:${tokenHash}`, String(row._id), "EX", 14 * 24 * 60 * 60)
  const tokenUrl = `${getEnv().APP_URL.replace(/\/$/, "")}/industry/${raw}`
  await AuditLog.create({
    actorId: session.userId,
    action: "deliverable.industryToken",
    payload: { id },
  })
  invalidateDeliverable(String(row.courseId), id)
  return { ok: true, message: "Industry token issued. It expires in 14 days.", tokenUrl }
}

export async function upsertCoAttainment(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const session = await requireSession()
  const id = String(formData.get("deliverableId") ?? "").trim()
  if (!objectId(id)) return { ok: false, message: "Deliverable is required." }
  await connectMongo()
  const row = await MajorDeliverable.findById(id)
  if (!row) return { ok: false, message: "Deliverable was not found." }
  if (integrityPaused(row)) {
    return { ok: false, message: "The CO sheet is paused while a plagiarism case is open." }
  }
  if (mentorBlocked(session, row)) {
    return { ok: false, message: "Mentors cannot edit the CO sheet." }
  }
  if (!(await canManageDeliverable(session.userId, row))) {
    return { ok: false, message: "Only assigned faculty or the supervisor can edit the CO sheet." }
  }
  const codes = formData.getAll("coCode").map((value) => String(value))
  const rows = codes.map((code, index) => ({
    code,
    statement: String(formData.getAll("coStatement")[index] ?? ""),
    level: String(formData.getAll("coLevel")[index] ?? ""),
    remarks: String(formData.getAll("coRemarks")[index] ?? ""),
  }))
  row.coAttainment = rows.filter((item) => item.code.trim() || item.statement.trim())
  await row.save()
  await AuditLog.create({
    actorId: session.userId,
    action: "deliverable.coSheet",
    payload: { id },
  })
  invalidateDeliverable(String(row.courseId), id)
  return { ok: true, message: "CO attainment sheet saved." }
}

export async function scoreInternshipInternal(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const session = await requireSession()
  const id = String(formData.get("deliverableId") ?? "").trim()
  const internal = Number(formData.get("internal") ?? "")
  if (!objectId(id)) return { ok: false, message: "Deliverable is required." }
  const invalid = validateInternshipHalf(internal, "Internal score")
  if (invalid) return { ok: false, message: invalid }
  await connectMongo()
  const row = await MajorDeliverable.findById(id)
  if (!row || row.type !== "INTERNSHIP") {
    return { ok: false, message: "Internal scores apply to internships only." }
  }
  if (integrityPaused(row)) {
    return { ok: false, message: "Scoring is paused while a plagiarism case is open." }
  }
  if (mentorBlocked(session, row)) {
    return { ok: false, message: "Mentors cannot score internships." }
  }
  if (!(await canManageDeliverable(session.userId, row))) {
    return { ok: false, message: "Only the supervisor or assigned faculty can enter the internal score." }
  }
  const internScores = { ...(row.internScores ?? {}), internal }
  if (Number.isFinite(internScores.external)) {
    internScores.total = internshipReportTotal(internal, Number(internScores.external))
  }
  row.internScores = internScores
  if (internScores.total !== undefined) {
    row.rubricScores = { total: internScores.total, remarks: row.rubricScores?.remarks }
  }
  await row.save()
  if (internScores.total !== undefined) {
    await recomputeDeliverableScores(row)
  }
  invalidateDeliverable(String(row.courseId), id)
  return { ok: true, message: "Internal score saved. Total appears when the industry score is in." }
}

export async function scoreDeliverableRubric(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const session = await requireSession()
  const id = String(formData.get("deliverableId") ?? "").trim()
  const total = Number(formData.get("rubricTotal") ?? "")
  const remarks = String(formData.get("rubricRemarks") ?? "").trim()
  if (!objectId(id)) return { ok: false, message: "Deliverable is required." }
  if (!Number.isFinite(total) || total < 0 || total > 30) {
    return { ok: false, message: "Rubric total must be between 0 and 30." }
  }
  await connectMongo()
  const row = await MajorDeliverable.findById(id)
  if (!row) return { ok: false, message: "Deliverable was not found." }
  if (row.type === "INTERNSHIP") {
    return { ok: false, message: "Internship uses the internal/external auto-total, not a manual final." }
  }
  if (integrityPaused(row)) {
    return { ok: false, message: "Scoring is paused while a plagiarism case is open." }
  }
  if (mentorBlocked(session, row)) {
    return { ok: false, message: "Mentors cannot score major deliverables." }
  }
  if (!(await canManageDeliverable(session.userId, row))) {
    return { ok: false, message: "Only the supervisor or assigned faculty can score this report." }
  }
  row.rubricScores = { total, remarks }
  await row.save()
  await recomputeDeliverableScores(row)
  invalidateDeliverable(String(row.courseId), id)
  return { ok: true, message: "30-point report score saved." }
}

export async function savePublication(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const id = String(formData.get("deliverableId") ?? "").trim()
  const { session, row, error } = await requireCandidate(id)
  if (!session || !row) return { ok: false, message: error ?? "Not allowed." }
  if (row.type !== "PG_THESIS") {
    return { ok: false, message: "Publication reports are only for PG Thesis." }
  }
  const title = String(formData.get("publicationTitle") ?? "").trim()
  const venue = String(formData.get("publicationVenue") ?? "").trim()
  const file = formData.get("proof")
  await connectMongo()
  let publication = await PaperPublication.findOne({ deliverableId: row._id })
  if (!publication) {
    publication = await PaperPublication.create({
      campusId: row.campusId,
      deliverableId: row._id,
      title,
      venue,
      status: "DRAFT",
      createdBy: session.userId,
    })
  } else if (publication.status !== "DRAFT" && publication.status !== "RETURNED") {
    return { ok: false, message: "The publication report is locked during sign-off." }
  } else {
    publication.title = title
    publication.venue = venue
  }
  if (file instanceof File && file.size > 0) {
    const saved = await saveUploadedFile({
      file,
      kind: "PROOF",
      campusId: String(row.campusId),
      uploadedBy: session.userId,
    })
    if (!saved.ok) return { ok: false, message: saved.message }
    publication.proofFileId = new Types.ObjectId(saved.fileId)
  }
  await publication.save()
  invalidateDeliverable(String(row.courseId), id)
  return { ok: true, message: "Publication report saved." }
}

export async function submitPublication(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const id = String(formData.get("deliverableId") ?? "").trim()
  const { session, row, error } = await requireCandidate(id)
  if (!session || !row) return { ok: false, message: error ?? "Not allowed." }
  await connectMongo()
  const publication = await PaperPublication.findOne({ deliverableId: row._id })
  if (row.type !== "PG_THESIS") {
    return { ok: false, message: "Publication reports are only for PG Thesis." }
  }
  if (!publication) return { ok: false, message: "Save the publication report first." }
  if (!publication.title.trim() || !publication.venue.trim()) {
    return { ok: false, message: "Publication title and venue are required." }
  }
  if (!publication.proofFileId) {
    return { ok: false, message: "Attach the publication proof PDF before you submit." }
  }
  if (!row.supervisorId) {
    return { ok: false, message: "Choose a supervisor before you submit the publication." }
  }
  if (publication.status !== "DRAFT" && publication.status !== "RETURNED") {
    return { ok: false, message: "This publication report is already in sign-off." }
  }
  const hasHod = await departmentHasHod(String(row.departmentId))
  await appendChain({
    campusId: String(row.campusId),
    targetType: "PAPER_PUBLICATION",
    targetId: String(publication._id),
    studentId: session.userId,
    hasCoSupervisor: Boolean(row.coSupervisorId),
    hasHod,
  })
  publication.status = "SUBMITTED"
  await publication.save()
  const supervisor = await User.findById(row.supervisorId)
  if (supervisor) {
    await notifySignoff({
      to: supervisor.email,
      kind: "signoff.waiting",
      deliverableId: String(row._id),
      courseId: String(row.courseId),
    })
  }
  invalidateDeliverable(String(row.courseId), id)
  return { ok: true, message: "Publication report submitted to the supervisor." }
}

export async function decidePublication(
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const session = await requireSession()
  const publicationId = String(formData.get("publicationId") ?? "").trim()
  const decision = String(formData.get("decision") ?? "").trim() as SignoffDecision
  const reason = String(formData.get("reason") ?? "").trim()
  if (!objectId(publicationId)) return { ok: false, message: "Publication is required." }
  if (decision !== "APPROVED" && decision !== "RETURNED" && decision !== "REJECTED") {
    return { ok: false, message: "Choose approve, return, or reject." }
  }
  if (decision !== "APPROVED" && !reason) {
    return { ok: false, message: "A reason is required when you return or reject." }
  }

  const locked = await withSignoffLock(`pub:${publicationId}`, async () => {
    await connectMongo()
    const publication = await PaperPublication.findById(publicationId)
    if (!publication) return { ok: false as const, message: "Publication was not found." }
    const row = await MajorDeliverable.findById(publication.deliverableId)
    if (!row) return { ok: false as const, message: "Deliverable was not found." }
    if (row.status === "UNDER_COMMITTEE_REVIEW") {
      return {
        ok: false as const,
        message: "Sign-off is paused while a plagiarism case is open.",
      }
    }
    if (publication.status !== "SUBMITTED") {
      return { ok: false as const, message: "This publication report is not waiting on a decision." }
    }
    const pending = await currentPendingStep("PAPER_PUBLICATION", publicationId)
    if (!pending) return { ok: false as const, message: "There is no waiting publication step." }
    if (!actorMayDecide(session, row, pending.role as Role)) {
      return { ok: false as const, message: "It is not your turn on the publication chain." }
    }
    pending.decision = decision
    pending.reason = reason || undefined
    pending.actorId = new Types.ObjectId(session.userId)
    pending.at = new Date()
    await Signoff.updateOne({ _id: pending._id }, { $set: pending })
    if (decision === "RETURNED" || decision === "REJECTED") {
      await closeRemainingSteps(
        "PAPER_PUBLICATION",
        publicationId,
        "Publication chain stopped after this decision."
      )
      publication.status = decision === "RETURNED" ? "RETURNED" : "REJECTED"
    } else if (!(await currentPendingStep("PAPER_PUBLICATION", publicationId))) {
      publication.status = "APPROVED"
    }
    await publication.save()
    invalidateDeliverable(String(row.courseId), String(row._id))
    return { ok: true as const, message: "Publication decision recorded." }
  })
  if (!locked.ok) return { ok: false, message: locked.message }
  return locked.value
}

async function closeRemainingSteps(
  targetType: "MAJOR_DELIVERABLE" | "PAPER_PUBLICATION",
  targetId: string,
  reason: string
) {
  await Signoff.updateMany(
    { targetType, targetId, decision: "PENDING" },
    {
      $set: {
        decision: "RETURNED",
        reason,
        at: new Date(),
      },
    }
  )
}

async function notifyNextActor(
  row: InstanceType<typeof MajorDeliverable>,
  role: Role
) {
  if (role === "SUPERVISOR" && row.supervisorId) {
    const user = await User.findById(row.supervisorId)
    if (user) {
      await notifySignoff({
        to: user.email,
        kind: "signoff.waiting",
        deliverableId: String(row._id),
        courseId: String(row.courseId),
      })
    }
    return
  }
  if (role === "CO_SUPERVISOR" && row.coSupervisorId) {
    const user = await User.findById(row.coSupervisorId)
    if (user) {
      await notifySignoff({
        to: user.email,
        kind: "signoff.waiting",
        deliverableId: String(row._id),
        courseId: String(row.courseId),
      })
    }
    return
  }
  const office = await User.findOne({
    campusId: row.campusId,
    roles: role,
    active: true,
    ...(role === "HOD" ? { departmentId: row.departmentId } : {}),
  })
  if (office) {
    await notifySignoff({
      to: office.email,
      kind: "signoff.waiting",
      deliverableId: String(row._id),
      courseId: String(row.courseId),
    })
  }
}

function integrityPaused(row: { status: string }) {
  return row.status === "UNDER_COMMITTEE_REVIEW"
}

function mentorBlocked(
  session: { userId: string; roles: Role[] },
  row: InstanceType<typeof MajorDeliverable>
) {
  if (!session.roles.includes("MENTOR") || session.roles.includes("FACULTY")) {
    return false
  }
  return (
    String(row.supervisorId) !== session.userId &&
    String(row.coSupervisorId) !== session.userId
  )
}

async function canManageDeliverable(
  userId: string,
  row: InstanceType<typeof MajorDeliverable>
) {
  if (String(row.supervisorId) === userId || String(row.coSupervisorId) === userId) {
    return true
  }
  const assigned = await FacultyAssignment.findOne({
    courseId: row.courseId,
    userId,
    role: "FACULTY",
  })
  return Boolean(assigned)
}

async function recomputeDeliverableScores(row: InstanceType<typeof MajorDeliverable>) {
  const recordType = recordTypeForDeliverable(row.type)
  for (const candidateId of row.candidateIds) {
    await recomputeSubjectScore(String(candidateId), String(row.courseId), recordType)
  }
}
