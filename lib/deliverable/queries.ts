import { Types } from "mongoose"
import { Course } from "@/lib/db/models/course"
import { Department } from "@/lib/db/models/department"
import { Enrollment } from "@/lib/db/models/enrollment"
import { StoredFile } from "@/lib/db/models/file"
import { IndustryToken } from "@/lib/db/models/industry-token"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { PaperPublication } from "@/lib/db/models/paper-publication"
import { Signoff } from "@/lib/db/models/signoff"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import {
  defaultDeliverableType,
  type DeliverableType,
} from "@/lib/domain/deliverable"
import type { RecordType } from "@/lib/domain/record-types"
import type { Role } from "@/lib/domain/roles"
import type { SignoffTargetType } from "@/lib/domain/signoff"
import { loadReportForTarget } from "@/lib/plagiarism/queries"
import type {
  CandidateView,
  DeliverableQueueItem,
  DeliverableView,
  EnrolledStudentOption,
  FileView,
  PublicationView,
  SignoffView,
  StaffOption,
} from "@/lib/deliverable/types"

function fileView(row: {
  _id: { toString(): string }
  originalName: string
  kind: string
  byteSize: number
} | null): FileView | null {
  if (!row) return null
  return {
    id: String(row._id),
    originalName: row.originalName,
    kind: row.kind,
    byteSize: row.byteSize,
  }
}

export async function currentPendingStep(
  targetType: SignoffTargetType,
  targetId: string
) {
  await connectMongo()
  return Signoff.findOne({
    targetType,
    targetId,
    decision: "PENDING",
  })
    .sort({ stepOrder: 1 })
    .lean()
}

export async function loadSignoffViews(
  targetType: SignoffTargetType,
  targetId: string
): Promise<SignoffView[]> {
  await connectMongo()
  const rows = await Signoff.find({ targetType, targetId })
    .sort({ stepOrder: 1, createdAt: 1 })
    .lean()
  const actors = await User.find({
    _id: { $in: rows.map((row) => row.actorId).filter(Boolean) },
  }).lean()
  const nameById = new Map(actors.map((user) => [String(user._id), user.name]))
  return rows.map((row) => ({
    id: String(row._id),
    stepOrder: row.stepOrder,
    role: row.role as Role,
    actorId: row.actorId ? String(row.actorId) : null,
    actorName: row.actorId ? nameById.get(String(row.actorId)) ?? null : null,
    decision: row.decision,
    reason: row.reason ?? "",
    at: row.at ? row.at.toISOString() : null,
  }))
}

export async function loadDeliverable(
  id: string
): Promise<DeliverableView | null> {
  if (!Types.ObjectId.isValid(id)) return null
  await connectMongo()
  const row = await MajorDeliverable.findById(id).lean()
  if (!row) return null
  const [course, supervisor, coSupervisor, word, pdf, steps, publication, token, report] =
    await Promise.all([
      Course.findById(row.courseId).lean(),
      row.supervisorId ? User.findById(row.supervisorId).lean() : null,
      row.coSupervisorId ? User.findById(row.coSupervisorId).lean() : null,
      row.wordFileId ? StoredFile.findById(row.wordFileId).lean() : null,
      row.pdfFileId ? StoredFile.findById(row.pdfFileId).lean() : null,
      loadSignoffViews("MAJOR_DELIVERABLE", String(row._id)),
      loadPublication(String(row._id)),
      IndustryToken.findOne({ deliverableId: row._id }).sort({ createdAt: -1 }).lean(),
      loadReportForTarget("MAJOR_DELIVERABLE", String(row._id)),
    ])
  const currentStep = steps.find((step) => step.decision === "PENDING") ?? null
  const lastReturn = [...steps]
    .reverse()
    .find((step) => step.decision === "RETURNED" && step.actorId)
  return {
    id: String(row._id),
    campusId: String(row.campusId),
    departmentId: String(row.departmentId),
    programmeId: String(row.programmeId),
    courseId: String(row.courseId),
    courseCode: course?.code ?? "Course",
    courseTitle: course?.title ?? "",
    termId: String(row.termId),
    type: row.type,
    title: row.title ?? "",
    branch: row.branch ?? "",
    specialization: row.specialization ?? "",
    status: row.status,
    candidates: row.candidates.map((item: {
      userId: { toString(): string }
      name: string
      email: string
      registrationNo?: string
    }) => ({
      id: String(item.userId),
      name: item.name,
      email: item.email,
      registrationNo: item.registrationNo ?? "",
    })),
    supervisorId: row.supervisorId ? String(row.supervisorId) : "",
    supervisorName: supervisor?.name ?? "",
    coSupervisorId: row.coSupervisorId ? String(row.coSupervisorId) : "",
    coSupervisorName: coSupervisor?.name ?? "",
    industrySupervisor: {
      name: row.industrySupervisor?.name ?? "",
      email: row.industrySupervisor?.email ?? "",
      org: row.industrySupervisor?.org ?? "",
    },
    word: fileView(word),
    pdf: fileView(pdf),
    internScores: {
      internal: row.internScores?.internal ?? null,
      external: row.internScores?.external ?? null,
      total: row.internScores?.total ?? null,
    },
    rubricTotal: row.rubricScores?.total ?? null,
    rubricRemarks: row.rubricScores?.remarks ?? "",
    coAttainment: (row.coAttainment ?? []).map((item: {
      code?: string
      statement?: string
      level?: string
      remarks?: string
    }) => ({
      code: item.code ?? "",
      statement: item.statement ?? "",
      level: item.level ?? "",
      remarks: item.remarks ?? "",
    })),
    steps,
    currentStep,
    publication,
    industryTokenUrl: token && token.expiresAt > new Date() ? "issued" : null,
    lastReturnReason: lastReturn?.reason ?? "",
    report,
  }
}

export async function loadPublication(
  deliverableId: string
): Promise<PublicationView | null> {
  await connectMongo()
  const row = await PaperPublication.findOne({ deliverableId }).lean()
  if (!row) return null
  const [proof, steps] = await Promise.all([
    row.proofFileId ? StoredFile.findById(row.proofFileId).lean() : null,
    loadSignoffViews("PAPER_PUBLICATION", String(row._id)),
  ])
  return {
    id: String(row._id),
    title: row.title ?? "",
    venue: row.venue ?? "",
    status: row.status,
    proof: fileView(proof),
    steps,
  }
}

export async function loadCourseDeliverable(
  studentId: string,
  courseId: string,
  recordType: RecordType
): Promise<DeliverableView | null> {
  const type = defaultDeliverableType(recordType)
  if (!type) return null
  await connectMongo()
  const types: DeliverableType[] =
    recordType === "PROJECT_REPORT"
      ? ["MINOR_PROJECT", "MAJOR_PROJECT"]
      : [type]
  const row = await MajorDeliverable.findOne({
    courseId,
    type: { $in: types },
    candidateIds: studentId,
  }).lean()
  if (!row) return null
  return loadDeliverable(String(row._id))
}

export async function loadQueueForRole(input: {
  role: "SUPERVISOR" | "CO_SUPERVISOR" | "HOD" | "DEAN"
  userId: string
  campusId: string
  departmentId: string | null
}): Promise<DeliverableQueueItem[]> {
  await connectMongo()
  const pending = await Signoff.find({
    role: input.role,
    decision: "PENDING",
  }).lean()
  if (pending.length === 0) return []

  const currentRows = await Signoff.find({
    targetType: { $in: [...new Set(pending.map((row) => row.targetType))] },
    targetId: { $in: [...new Set(pending.map((row) => row.targetId))] },
    decision: "PENDING",
  })
    .sort({ stepOrder: 1 })
    .lean()
  const firstByTarget = new Map<string, (typeof currentRows)[number]>()
  for (const step of currentRows) {
    const key = `${step.targetType}:${String(step.targetId)}`
    if (!firstByTarget.has(key)) firstByTarget.set(key, step)
  }
  const mine = pending.filter((step) => {
    const first = firstByTarget.get(`${step.targetType}:${String(step.targetId)}`)
    return first && String(first._id) === String(step._id)
  })
  if (mine.length === 0) return []

  const deliverableIds = mine
    .filter((step) => step.targetType === "MAJOR_DELIVERABLE")
    .map((step) => step.targetId)
  const publicationIds = mine
    .filter((step) => step.targetType === "PAPER_PUBLICATION")
    .map((step) => step.targetId)
  const publications = publicationIds.length
    ? await PaperPublication.find({ _id: { $in: publicationIds } }).lean()
    : []
  const pubById = new Map(publications.map((row) => [String(row._id), row]))
  const allDeliverableIds = [
    ...deliverableIds,
    ...publications.map((row) => row.deliverableId),
  ]
  const rows = await MajorDeliverable.find({
    _id: { $in: allDeliverableIds },
    campusId: input.campusId,
    status: { $ne: "UNDER_COMMITTEE_REVIEW" },
  }).lean()
  const filtered = rows.filter((row) => {
    if (input.role === "SUPERVISOR") return String(row.supervisorId) === input.userId
    if (input.role === "CO_SUPERVISOR") {
      return String(row.coSupervisorId) === input.userId
    }
    if (input.role === "HOD") {
      return input.departmentId && String(row.departmentId) === input.departmentId
    }
    return true
  })
  const byId = new Map(filtered.map((row) => [String(row._id), row]))
  const courses = await Course.find({
    _id: { $in: filtered.map((row) => row.courseId) },
  }).lean()
  const courseById = new Map(courses.map((course) => [String(course._id), course]))

  return mine
    .map((step) => {
      const deliverableId =
        step.targetType === "MAJOR_DELIVERABLE"
          ? String(step.targetId)
          : pubById.get(String(step.targetId))
            ? String(pubById.get(String(step.targetId))!.deliverableId)
            : ""
      const row = byId.get(deliverableId)
      if (!row) return null
      const course = courseById.get(String(row.courseId))
      const publication = pubById.get(String(step.targetId))
      return {
        id: String(row._id),
        title:
          step.targetType === "PAPER_PUBLICATION"
            ? `Publication: ${publication?.title || row.title || "Untitled"}`
            : row.title || "Untitled deliverable",
        type: row.type,
        status: row.status,
        courseCode: course?.code ?? "Course",
        courseTitle: course?.title ?? "",
        candidateNames: row.candidates.map((item: { name: string }) => item.name).join(", "),
        waitingOn: input.role,
        waitingKind:
          step.targetType === "PAPER_PUBLICATION"
            ? ("PUBLICATION" as const)
            : ("DELIVERABLE" as const),
        updatedAt: row.updatedAt.toISOString(),
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function loadCourseDeliverables(courseId: string) {
  await connectMongo()
  const rows = await MajorDeliverable.find({ courseId })
    .sort({ updatedAt: -1 })
    .lean()
  const views = await Promise.all(rows.map((row) => loadDeliverable(String(row._id))))
  return views.filter((item): item is NonNullable<typeof item> => Boolean(item))
}

export async function loadStaffOptions(campusId: string): Promise<StaffOption[]> {
  await connectMongo()
  const users = await User.find({
    campusId,
    active: true,
    roles: { $in: ["FACULTY", "SUPERVISOR"] },
  })
    .sort({ name: 1 })
    .lean()
  return users.map((user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    roles: user.roles,
  }))
}

export async function loadEnrolledStudents(
  courseId: string
): Promise<EnrolledStudentOption[]> {
  await connectMongo()
  const enrollments = await Enrollment.find({ courseId }).lean()
  const users = await User.find({
    _id: { $in: enrollments.map((item) => item.studentId) },
  })
    .sort({ name: 1 })
    .lean()
  return users.map((user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    registrationNo: user.registrationNo ?? "",
  }))
}

export async function departmentHasHod(departmentId: string) {
  await connectMongo()
  const hod = await User.findOne({
    departmentId,
    roles: "HOD",
    active: true,
  }).lean()
  return Boolean(hod)
}

export async function snapshotCandidates(
  ids: string[]
): Promise<CandidateView[]> {
  await connectMongo()
  const users = await User.find({ _id: { $in: ids } }).lean()
  const byId = new Map(users.map((user) => [String(user._id), user]))
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((user) => ({
      id: String(user!._id),
      name: user!.name,
      email: user!.email,
      registrationNo: user!.registrationNo ?? "",
    }))
}

export async function loadCoverMeta(courseId: string) {
  await connectMongo()
  const course = await Course.findById(courseId).lean()
  if (!course) return null
  const department = await Department.findById(course.departmentId).lean()
  return {
    campusId: String(course.campusId),
    departmentId: String(course.departmentId),
    programmeId: String(course.programmeId),
    termId: String(course.termId),
    branch: department?.code ?? "",
  }
}
