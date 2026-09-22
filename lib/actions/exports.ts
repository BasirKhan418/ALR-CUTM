"use server"

import { revalidatePath } from "next/cache"
import { Types } from "mongoose"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { AuditLog } from "@/lib/db/models/audit-log"
import { Enrollment } from "@/lib/db/models/enrollment"
import { ExportRequest } from "@/lib/db/models/export-request"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import { BOOKLET_JOB, WORKSHOP_CERT_JOB } from "@/lib/domain/booklet"
import { canReadStudentRecord } from "@/lib/exports/access"
import { exportsQueue } from "@/lib/queue/queues"

export type ExportFormState = {
  ok: boolean
  message?: string
}

function fail(message: string): ExportFormState {
  return { ok: false, message }
}

async function queueExport(input: {
  campusId: string
  studentId: string
  requestedBy: string
  kind: "BOOKLET" | "WORKSHOP"
  scope?: "YEAR" | "PROGRAM"
  academicYear?: string
  courseId?: string
  job: string
}) {
  const request = await ExportRequest.create({
    campusId: input.campusId,
    studentId: input.studentId,
    requestedBy: input.requestedBy,
    kind: input.kind,
    scope: input.scope,
    academicYear: input.academicYear,
    courseId: input.courseId,
    status: "QUEUED",
  })
  await AuditLog.create({
    actorId: input.requestedBy,
    action: input.job,
    payload: { requestId: String(request._id), studentId: input.studentId },
  })
  await exportsQueue().add(input.job, { requestId: String(request._id) })
  revalidatePath("/student/exports")
  revalidatePath("/faculty/exports")
  revalidatePath("/hod/analytics")
  return { ok: true as const, message: "Export queued. Refresh this page for the download link." }
}

export async function requestLearningRecord(
  _prev: ExportFormState,
  formData: FormData
): Promise<ExportFormState> {
  const session = await requireSession()
  await connectMongo()
  const scope = formData.get("scope") === "PROGRAM" ? "PROGRAM" : "YEAR"
  const academicYear = String(formData.get("academicYear") ?? "").trim()
  const requestedStudent = String(formData.get("studentId") ?? "").trim()
  const studentId = hasRole(session, "STUDENT") ? session.userId : requestedStudent

  if (!Types.ObjectId.isValid(studentId)) return fail("Choose a student.")
  if (scope === "YEAR" && !/^\d{4}-\d{2}$/.test(academicYear)) {
    return fail("Choose an academic year.")
  }
  if (!(await canReadStudentRecord(session, studentId))) {
    return fail("That student is outside your campus.")
  }
  const student = await User.findById(studentId).select("campusId").lean()
  if (!student) return fail("Student was not found.")

  return queueExport({
    campusId: String(student.campusId),
    studentId,
    requestedBy: session.userId,
    kind: "BOOKLET",
    scope,
    academicYear: scope === "YEAR" ? academicYear : undefined,
    job: BOOKLET_JOB,
  })
}

export async function requestWorkshopCertificate(
  _prev: ExportFormState,
  formData: FormData
): Promise<ExportFormState> {
  const session = await requireSession()
  await connectMongo()
  const courseId = String(formData.get("courseId") ?? "").trim()
  const requestedStudent = String(formData.get("studentId") ?? "").trim()
  const studentId = hasRole(session, "STUDENT") ? session.userId : requestedStudent
  if (!Types.ObjectId.isValid(studentId) || !Types.ObjectId.isValid(courseId)) {
    return fail("Choose a student and a course.")
  }
  if (!(await canReadStudentRecord(session, studentId))) {
    return fail("That student is outside your campus.")
  }
  const enrolled = await Enrollment.exists({ studentId, courseId })
  if (!enrolled) return fail("That student is not enrolled on the course.")
  const student = await User.findById(studentId).select("campusId").lean()
  if (!student) return fail("Student was not found.")

  return queueExport({
    campusId: String(student.campusId),
    studentId,
    requestedBy: session.userId,
    kind: "WORKSHOP",
    courseId,
    job: WORKSHOP_CERT_JOB,
  })
}
