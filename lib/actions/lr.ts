"use server"

import { Types } from "mongoose"
import { revalidatePath } from "next/cache"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { AuditLog } from "@/lib/db/models/audit-log"
import { Course } from "@/lib/db/models/course"
import { Enrollment } from "@/lib/db/models/enrollment"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import {
  isLiveLrRecordType,
  isStubLrRecordType,
  missingRecordTypeMessage,
  validateLrSubmit,
  type LrNarrativeFields,
} from "@/lib/domain/lr"
import { isRecordType, type RecordType } from "@/lib/domain/record-types"
import {
  listMyEntries as listStoredEntries,
  loadWorkshopCertificateData,
} from "@/lib/lr/queries"
import type { WorkshopCertificateData } from "@/lib/lr/types"
import { notifyQueue } from "@/lib/queue/queues"

export type LrFormState = {
  ok: boolean
  message?: string
}

function objectId(value: string) {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null
}

function readFields(formData: FormData): LrNarrativeFields {
  return {
    sessionDate: String(formData.get("sessionDate") ?? ""),
    topic: String(formData.get("topic") ?? ""),
    reflection: String(formData.get("reflection") ?? ""),
    hours: String(formData.get("hours") ?? ""),
    experimentNo: String(formData.get("experimentNo") ?? ""),
    title: String(formData.get("title") ?? ""),
    concept: String(formData.get("concept") ?? ""),
    planning: String(formData.get("planning") ?? ""),
    result: String(formData.get("result") ?? ""),
    recordNotes: String(formData.get("recordNotes") ?? ""),
    vivaNotes: String(formData.get("vivaNotes") ?? ""),
    taskTitle: String(formData.get("taskTitle") ?? ""),
    criticalThinking: String(formData.get("criticalThinking") ?? ""),
    hoursContributed: String(formData.get("hoursContributed") ?? ""),
    booksManuals: String(formData.get("booksManuals") ?? ""),
  }
}

function optionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function optionalDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function applyFields(
  entry: InstanceType<typeof LrEntry>,
  recordType: RecordType,
  fields: LrNarrativeFields
) {
  entry.booksManuals = fields.booksManuals?.trim() || undefined
  if (recordType === "CLASSROOM_LEARNING") {
    entry.sessionDate = optionalDate(fields.sessionDate ?? "")
    entry.topic = fields.topic?.trim() || undefined
    entry.reflection = fields.reflection?.trim() || undefined
    entry.hours = optionalNumber(fields.hours ?? "")
  }
  if (recordType === "APPLIED_ACTION_LEARNING") {
    entry.experimentNo = optionalNumber(fields.experimentNo ?? "")
    entry.title = fields.title?.trim() || undefined
    entry.concept = fields.concept?.trim() || undefined
    entry.planning = fields.planning?.trim() || undefined
    entry.result = fields.result?.trim() || undefined
    entry.recordNotes = fields.recordNotes?.trim() || undefined
    entry.vivaNotes = fields.vivaNotes?.trim() || undefined
  }
  if (recordType === "ACTION_LEARNING") {
    entry.taskTitle = fields.taskTitle?.trim() || undefined
    entry.criticalThinking = fields.criticalThinking?.trim() || undefined
    entry.hoursContributed = optionalNumber(fields.hoursContributed ?? "")
  }
}

function invalidateLr(courseId: string) {
  revalidatePath("/student")
  revalidatePath(`/student/courses/${courseId}`)
  revalidatePath("/faculty")
  revalidatePath("/faculty/inbox")
  revalidatePath(`/faculty/courses/${courseId}`)
}

async function loadWritableCourse(sessionUserId: string, courseId: string) {
  await connectMongo()
  const [course, enrollment] = await Promise.all([
    Course.findById(courseId),
    Enrollment.findOne({ studentId: sessionUserId, courseId }),
  ])
  if (!course) return { course: null, error: "Course was not found." }
  if (!enrollment) {
    return { course: null, error: "You are not enrolled in this course." }
  }
  return { course, error: null }
}

function courseHasRecord(
  course: { recordConfigs: { recordType: RecordType }[] },
  recordType: RecordType
) {
  return course.recordConfigs.some((config) => config.recordType === recordType)
}

export async function listMyEntries(courseId?: string, recordType?: string) {
  const session = await requireSession()
  if (!hasRole(session, "STUDENT")) return []
  const type = recordType && isRecordType(recordType) ? recordType : undefined
  return listStoredEntries(session.userId, courseId, type)
}

export async function upsertEntryDraft(
  _prev: LrFormState,
  formData: FormData
): Promise<LrFormState> {
  return saveEntry(formData, "DRAFT")
}

export async function submitEntry(
  _prev: LrFormState,
  formData: FormData
): Promise<LrFormState> {
  return saveEntry(formData, "SUBMITTED")
}

export async function saveLrEntry(
  _prev: LrFormState,
  formData: FormData
): Promise<LrFormState> {
  const intent = String(formData.get("intent") ?? "draft")
  return saveEntry(formData, intent === "submit" ? "SUBMITTED" : "DRAFT")
}

async function saveEntry(
  formData: FormData,
  nextStatus: "DRAFT" | "SUBMITTED"
): Promise<LrFormState> {
  const session = await requireSession()
  if (!hasRole(session, "STUDENT")) {
    return { ok: false, message: "Only a student can file a Learning Record." }
  }

  const courseId = String(formData.get("courseId") ?? "").trim()
  const recordType = String(formData.get("recordType") ?? "").trim()
  const entryId = String(formData.get("entryId") ?? "").trim()
  if (!objectId(courseId)) return { ok: false, message: "Course is required." }
  if (!isRecordType(recordType)) {
    return { ok: false, message: "Choose a record type from this subject." }
  }
  if (isStubLrRecordType(recordType)) {
    return { ok: false, message: "That record type opens in a later milestone." }
  }
  if (!isLiveLrRecordType(recordType)) {
    return { ok: false, message: "That record type cannot be filed yet." }
  }

  const { course, error } = await loadWritableCourse(session.userId, courseId)
  if (!course) return { ok: false, message: error ?? "Course was not found." }
  if (!courseHasRecord(course, recordType)) {
    return { ok: false, message: missingRecordTypeMessage(recordType) }
  }

  const fields = readFields(formData)
  if (nextStatus === "SUBMITTED") {
    const invalid = validateLrSubmit(recordType, fields)
    if (invalid) return { ok: false, message: invalid }
  }

  let entry = entryId && objectId(entryId) ? await LrEntry.findById(entryId) : null
  if (entry) {
    if (String(entry.studentId) !== session.userId) {
      return { ok: false, message: "You can only edit your own records." }
    }
    if (String(entry.courseId) !== courseId || entry.recordType !== recordType) {
      return { ok: false, message: "This entry does not belong to that course." }
    }
    if (entry.status === "SUBMITTED") {
      return { ok: false, message: "A submitted record cannot be edited yet." }
    }
  } else {
    entry = new LrEntry({
      campusId: course.campusId,
      studentId: session.userId,
      courseId,
      termId: course.termId,
      recordType,
      status: "DRAFT",
    })
  }

  applyFields(entry, recordType, fields)
  if (nextStatus === "SUBMITTED") {
    entry.status = "SUBMITTED"
    entry.submittedAt = new Date()
  } else {
    entry.status = "DRAFT"
  }
  await entry.save()

  if (nextStatus === "SUBMITTED") {
    await AuditLog.create({
      actorId: session.userId,
      action: "lr.submit",
      payload: {
        entryId: String(entry._id),
        courseId,
        recordType,
      },
    })
    try {
      const faculty = await FacultyAssignment.find({
        courseId,
        role: "FACULTY",
      }).lean()
      const people = await User.find({
        _id: { $in: faculty.map((item) => item.userId) },
      }).lean()
      for (const person of people) {
        await notifyQueue().add("notify.email", {
          kind: "lr.submitted",
          to: person.email,
          courseId,
          recordType,
          studentName: session.name,
        })
      }
    } catch (notifyError) {
      console.error("[lr] notify.email enqueue failed", notifyError)
    }
  }

  invalidateLr(courseId)
  return {
    ok: true,
    message:
      nextStatus === "SUBMITTED"
        ? "Record submitted. Faculty can read it; scoring opens later."
        : "Draft saved.",
  }
}

export async function getWorkshopHoursCertificateData(
  courseId: string
): Promise<{ ok: boolean; message?: string; data?: WorkshopCertificateData }> {
  const session = await requireSession()
  if (!hasRole(session, "STUDENT")) {
    return { ok: false, message: "Only the enrolled student can read their hours certificate data." }
  }
  if (!objectId(courseId)) return { ok: false, message: "Course is required." }

  const { course, error } = await loadWritableCourse(session.userId, courseId)
  if (!course) return { ok: false, message: error ?? "Course was not found." }
  if (!courseHasRecord(course, "ACTION_LEARNING")) {
    return { ok: false, message: missingRecordTypeMessage("ACTION_LEARNING") }
  }

  const { loadCampusCatalog } = await import("@/lib/catalog/queries")
  const catalog = await loadCampusCatalog(String(course.campusId))
  const view = catalog.find((item) => item.id === courseId)
  if (!view) return { ok: false, message: "Course was not found." }

  const data = await loadWorkshopCertificateData(
    session.userId,
    view,
    session.name,
    session.email
  )
  return { ok: true, data }
}
