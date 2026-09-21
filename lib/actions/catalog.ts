"use server"

import { Types } from "mongoose"
import { revalidatePath, updateTag } from "next/cache"
import { redirect } from "next/navigation"
import { hasRole, requireSession, type AppSession } from "@/lib/auth/guards"
import { AuditLog } from "@/lib/db/models/audit-log"
import { Campus } from "@/lib/db/models/campus"
import { Course } from "@/lib/db/models/course"
import { Department } from "@/lib/db/models/department"
import { Enrollment } from "@/lib/db/models/enrollment"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { ClassroomComponents } from "@/lib/db/models/classroom-components"
import { IndustryToken } from "@/lib/db/models/industry-token"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { PaperPublication } from "@/lib/db/models/paper-publication"
import { PlagiarismCase } from "@/lib/db/models/plagiarism-case"
import { PlagiarismReport } from "@/lib/db/models/plagiarism-report"
import { ProgrammingUpload } from "@/lib/db/models/programming-upload"
import { Signoff } from "@/lib/db/models/signoff"
import { SubjectScore } from "@/lib/db/models/subject-score"
import { Programme } from "@/lib/db/models/programme"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import { normalizeEmail } from "@/lib/auth/otp"
import {
  buildRecordConfigs,
  deliveryModeFor,
} from "@/lib/domain/catalog"
import { isCombinationCode } from "@/lib/domain/subject-map"
import {
  CLASSROOM_COMPOSITE_KEYS,
  isValidClassroomComposites,
  type ClassroomCompositeWeights,
} from "@/lib/domain/weights"
import {
  readClassroomComposites,
  writeClassroomComposites,
} from "@/lib/catalog/settings"

export type CatalogFormState = {
  ok: boolean
  message?: string
}

function objectId(value: string) {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null
}

function canManageCatalog(
  session: AppSession,
  campusId: string,
  departmentId?: string | null
): boolean {
  if (hasRole(session, "ADMIN")) return true
  if (!hasRole(session, "FACULTY")) return false
  if (session.campusId !== campusId) return false
  if (
    session.departmentId &&
    departmentId &&
    session.departmentId !== departmentId
  ) {
    return false
  }
  return true
}

async function canManageCourse(
  session: AppSession,
  course: { _id: Types.ObjectId; campusId: Types.ObjectId; departmentId: Types.ObjectId }
) {
  if (hasRole(session, "ADMIN")) return true
  if (!hasRole(session, "FACULTY")) return false
  if (session.campusId !== String(course.campusId)) return false
  const assigned = await FacultyAssignment.findOne({
    courseId: course._id,
    userId: session.userId,
    role: "FACULTY",
  })
  if (assigned) return true
  return canManageCatalog(session, String(course.campusId), String(course.departmentId))
}

async function requireCatalogEditor() {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN", "FACULTY")) {
    return { session: null as null, error: "Only Admin or Faculty can manage courses." }
  }
  return { session, error: null }
}

function invalidateCatalog(campusId: string, courseId?: string) {
  updateTag("catalog")
  updateTag(campusId)
  revalidatePath("/admin/courses")
  revalidatePath("/faculty")
  revalidatePath("/faculty/inbox")
  revalidatePath("/student")
  revalidatePath("/mentor")
  if (courseId) {
    revalidatePath(`/admin/courses/${courseId}`)
    revalidatePath(`/faculty/courses/${courseId}`)
    revalidatePath(`/student/courses/${courseId}`)
  }
}

export async function createCourse(
  _prev: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const { session, error } = await requireCatalogEditor()
  if (!session) return { ok: false, message: error }

  const campusId = String(formData.get("campusId") ?? "").trim()
  const departmentId = String(formData.get("departmentId") ?? "").trim()
  const programmeId = String(formData.get("programmeId") ?? "").trim()
  const termId = String(formData.get("termId") ?? "").trim()
  const code = String(formData.get("code") ?? "").trim().toUpperCase()
  const title = String(formData.get("title") ?? "").trim()
  const combinationCode = String(formData.get("combinationCode") ?? "").trim()
  const returnTo = String(formData.get("returnTo") ?? "").trim()

  if (!objectId(campusId)) return { ok: false, message: "Campus is required." }
  if (!objectId(departmentId)) {
    return { ok: false, message: "Department is required." }
  }
  if (!objectId(programmeId)) {
    return { ok: false, message: "Programme is required." }
  }
  if (!objectId(termId)) return { ok: false, message: "Term is required." }
  if (!code) return { ok: false, message: "Course code is required." }
  if (!title) return { ok: false, message: "Title is required." }
  if (!isCombinationCode(combinationCode)) {
    return { ok: false, message: "Choose a combination code." }
  }
  if (!canManageCatalog(session, campusId, departmentId)) {
    return { ok: false, message: "You can only set up courses in your department." }
  }

  await connectMongo()
  const [campus, department, programme, term] = await Promise.all([
    Campus.findById(campusId),
    Department.findById(departmentId),
    Programme.findById(programmeId),
    Term.findById(termId),
  ])
  if (!campus || !department || !programme || !term) {
    return { ok: false, message: "Campus, department, programme, or term was not found." }
  }
  if (
    String(department.campusId) !== campusId ||
    String(programme.campusId) !== campusId ||
    String(programme.departmentId) !== departmentId
  ) {
    return { ok: false, message: "Department and programme must belong to that campus." }
  }

  const existing = await Course.findOne({ code, termId })
  if (existing) {
    return { ok: false, message: "That course code is already used in this term." }
  }

  const composites = await readClassroomComposites()
  const course = await Course.create({
    campusId,
    departmentId,
    programmeId,
    code,
    title,
    termId,
    combinationCode,
    deliveryMode: deliveryModeFor(combinationCode),
    recordConfigs: buildRecordConfigs(combinationCode, composites),
    createdBy: session.userId,
  })

  if (hasRole(session, "FACULTY")) {
    await FacultyAssignment.updateOne(
      { courseId: course._id, userId: session.userId, role: "FACULTY" },
      { $set: { courseId: course._id, userId: session.userId, role: "FACULTY" } },
      { upsert: true }
    )
  }

  await AuditLog.create({
    actorId: session.userId,
    action: "course.create",
    payload: {
      courseId: String(course._id),
      code,
      combinationCode,
    },
  })
  invalidateCatalog(campusId, String(course._id))
  const base = returnTo.startsWith("/faculty") ? "/faculty" : "/admin"
  redirect(`${base}/courses/${String(course._id)}`)
}

export async function updateCourseCombination(
  _prev: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const { session, error } = await requireCatalogEditor()
  if (!session) return { ok: false, message: error }

  const courseId = String(formData.get("courseId") ?? "").trim()
  const combinationCode = String(formData.get("combinationCode") ?? "").trim()
  if (!objectId(courseId)) return { ok: false, message: "Course is required." }
  if (!isCombinationCode(combinationCode)) {
    return { ok: false, message: "Choose a combination code." }
  }

  await connectMongo()
  const course = await Course.findById(courseId)
  if (!course) return { ok: false, message: "Course was not found." }
  if (!(await canManageCourse(session, course))) {
    return { ok: false, message: "You cannot change this course." }
  }

  const existingSplit = course.recordConfigs.find(
    (config: { recordType: string; compositeWeights?: ClassroomCompositeWeights }) =>
      config.recordType === "CLASSROOM_LEARNING"
  )?.compositeWeights
  const composites = existingSplit
    ? { ...existingSplit }
    : await readClassroomComposites()
  course.combinationCode = combinationCode
  course.deliveryMode = deliveryModeFor(combinationCode)
  course.recordConfigs = buildRecordConfigs(combinationCode, composites)
  await course.save()
  const nextTypes = course.recordConfigs.map(
    (config: { recordType: string }) => config.recordType
  )
  await LrEntry.deleteMany({
    courseId: course._id,
    status: "DRAFT",
    recordType: { $nin: nextTypes },
  })
  await SubjectScore.deleteMany({
    courseId: course._id,
    recordType: { $nin: nextTypes },
  })
  if (!nextTypes.includes("CLASSROOM_LEARNING")) {
    await ClassroomComponents.deleteMany({ courseId: course._id })
  }
  if (!nextTypes.includes("APPLIED_ACTION_LEARNING")) {
    const uploads = await ProgrammingUpload.find({ courseId: course._id }).select("_id")
    await PlagiarismReport.deleteMany({
      targetType: "PROGRAMMING_UPLOAD",
      targetId: { $in: uploads.map((row) => row._id) },
    })
    await PlagiarismCase.deleteMany({
      targetType: "PROGRAMMING_UPLOAD",
      targetId: { $in: uploads.map((row) => row._id) },
    })
    await ProgrammingUpload.deleteMany({ courseId: course._id })
  }
  const droppedDeliverableTypes = [
    ...(!nextTypes.includes("PROJECT_REPORT")
      ? (["MINOR_PROJECT", "MAJOR_PROJECT"] as const)
      : []),
    ...(!nextTypes.includes("INTERNSHIP_REPORT") ? (["INTERNSHIP"] as const) : []),
    ...(!nextTypes.includes("THESIS_REPORT") ? (["PG_THESIS"] as const) : []),
  ]
  if (droppedDeliverableTypes.length > 0) {
    const leftovers = await MajorDeliverable.find({
      courseId: course._id,
      type: { $in: droppedDeliverableTypes },
    }).select("_id")
    const leftoverIds = leftovers.map((row) => row._id)
    if (leftoverIds.length > 0) {
      const publications = await PaperPublication.find({
        deliverableId: { $in: leftoverIds },
      }).select("_id")
      await Signoff.deleteMany({
        targetType: "MAJOR_DELIVERABLE",
        targetId: { $in: leftoverIds },
      })
      await Signoff.deleteMany({
        targetType: "PAPER_PUBLICATION",
        targetId: { $in: publications.map((row) => row._id) },
      })
      await PaperPublication.deleteMany({ deliverableId: { $in: leftoverIds } })
      await IndustryToken.deleteMany({ deliverableId: { $in: leftoverIds } })
      await PlagiarismReport.deleteMany({ deliverableId: { $in: leftoverIds } })
      await PlagiarismCase.deleteMany({ deliverableId: { $in: leftoverIds } })
      await MajorDeliverable.deleteMany({ _id: { $in: leftoverIds } })
    }
  }
  await AuditLog.create({
    actorId: session.userId,
    action: "course.combination",
    payload: { courseId, combinationCode },
  })
  invalidateCatalog(String(course.campusId), courseId)
  return { ok: true, message: "Required records were rebuilt from the combination code." }
}

export async function enrollStudents(
  _prev: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const { session, error } = await requireCatalogEditor()
  if (!session) return { ok: false, message: error }

  const courseId = String(formData.get("courseId") ?? "").trim()
  const raw = String(formData.get("emails") ?? "")
  const selected = formData.getAll("studentIds").map((value) => String(value))
  if (!objectId(courseId)) return { ok: false, message: "Course is required." }

  await connectMongo()
  const course = await Course.findById(courseId)
  if (!course) return { ok: false, message: "Course was not found." }
  if (!(await canManageCourse(session, course))) {
    return { ok: false, message: "You cannot enroll students on this course." }
  }

  const emails = raw
    .split(/[\s,;]+/)
    .map(normalizeEmail)
    .filter(Boolean)
  const ids = selected.filter((id) => objectId(id))
  if (emails.length === 0 && ids.length === 0) {
    return { ok: false, message: "Paste emails or select at least one student." }
  }
  const students = await User.find({
    campusId: course.campusId,
    roles: "STUDENT",
    active: true,
    $or: [
      ...(ids.length ? [{ _id: { $in: ids } }] : []),
      ...(emails.length ? [{ email: { $in: emails } }] : []),
    ],
  })

  if (students.length === 0) {
    return { ok: false, message: "No matching students on this campus." }
  }

  let added = 0
  for (const student of students) {
    const result = await Enrollment.updateOne(
      { studentId: student._id, courseId: course._id, termId: course.termId },
      {
        $set: {
          studentId: student._id,
          courseId: course._id,
          termId: course.termId,
        },
      },
      { upsert: true }
    )
    if (result.upsertedCount) added += 1
  }

  await AuditLog.create({
    actorId: session.userId,
    action: "course.enroll",
    payload: { courseId, added, emails },
  })
  invalidateCatalog(String(course.campusId), courseId)
  return {
    ok: true,
    message:
      added === 0
        ? "Those students were already enrolled."
        : `Enrolled ${added} student${added === 1 ? "" : "s"}.`,
  }
}

export async function unenrollStudent(
  courseId: string,
  studentId: string
): Promise<CatalogFormState> {
  const { session, error } = await requireCatalogEditor()
  if (!session) return { ok: false, message: error }
  if (!objectId(courseId) || !objectId(studentId)) {
    return { ok: false, message: "Course and student are required." }
  }
  await connectMongo()
  const course = await Course.findById(courseId)
  if (!course) return { ok: false, message: "Course was not found." }
  if (!(await canManageCourse(session, course))) {
    return { ok: false, message: "You cannot change enrollment on this course." }
  }
  await Enrollment.deleteOne({ courseId, studentId })
  await AuditLog.create({
    actorId: session.userId,
    action: "course.unenroll",
    payload: { courseId, studentId },
  })
  invalidateCatalog(String(course.campusId), courseId)
  return { ok: true, message: "Student removed from the course." }
}

async function assignStaff(
  courseId: string,
  userId: string,
  role: "FACULTY" | "MENTOR"
): Promise<CatalogFormState> {
  const { session, error } = await requireCatalogEditor()
  if (!session) return { ok: false, message: error }
  if (!objectId(courseId) || !objectId(userId)) {
    return { ok: false, message: "Course and person are required." }
  }
  await connectMongo()
  const [course, user] = await Promise.all([
    Course.findById(courseId),
    User.findById(userId),
  ])
  if (!course) return { ok: false, message: "Course was not found." }
  if (!user || !user.active) return { ok: false, message: "That person was not found." }
  if (!(await canManageCourse(session, course))) {
    return { ok: false, message: "You cannot assign staff on this course." }
  }
  if (String(user.campusId) !== String(course.campusId)) {
    return { ok: false, message: "Staff must belong to the same campus." }
  }
  if (!user.roles.includes(role)) {
    return {
      ok: false,
      message:
        role === "MENTOR"
          ? "That person does not have the Mentor role."
          : "That person does not have the Faculty role.",
    }
  }
  await FacultyAssignment.updateOne(
    { courseId, userId, role },
    { $set: { courseId, userId, role } },
    { upsert: true }
  )
  await AuditLog.create({
    actorId: session.userId,
    action: role === "MENTOR" ? "course.assignMentor" : "course.assignFaculty",
    payload: { courseId, userId },
  })
  invalidateCatalog(String(course.campusId), courseId)
  return {
    ok: true,
    message:
      role === "MENTOR"
        ? "PO/PSO Mentor assigned."
        : "Faculty assigned.",
  }
}

export async function assignFaculty(
  _prev: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  return assignStaff(
    String(formData.get("courseId") ?? ""),
    String(formData.get("userId") ?? ""),
    "FACULTY"
  )
}

export async function assignMentor(
  _prev: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  return assignStaff(
    String(formData.get("courseId") ?? ""),
    String(formData.get("userId") ?? ""),
    "MENTOR"
  )
}

export async function unassignStaff(
  courseId: string,
  assignmentId: string
): Promise<CatalogFormState> {
  const { session, error } = await requireCatalogEditor()
  if (!session) return { ok: false, message: error }
  if (!objectId(courseId) || !objectId(assignmentId)) {
    return { ok: false, message: "Assignment is required." }
  }
  await connectMongo()
  const course = await Course.findById(courseId)
  if (!course) return { ok: false, message: "Course was not found." }
  if (!(await canManageCourse(session, course))) {
    return { ok: false, message: "You cannot change staff on this course." }
  }
  await FacultyAssignment.deleteOne({ _id: assignmentId, courseId })
  await AuditLog.create({
    actorId: session.userId,
    action: "course.unassign",
    payload: { courseId, assignmentId },
  })
  invalidateCatalog(String(course.campusId), courseId)
  return { ok: true, message: "Assignment removed." }
}

export async function updateClassroomComposites(
  _prev: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return { ok: false, message: "Only Admin can edit the classroom split." }
  }

  const weights = {} as ClassroomCompositeWeights
  for (const key of CLASSROOM_COMPOSITE_KEYS) {
    const parsed = Number(formData.get(key))
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ok: false, message: "Each composite must be a number of 0 or more." }
    }
    weights[key] = parsed
  }
  if (!isValidClassroomComposites(weights)) {
    return { ok: false, message: "The four classroom components must sum to 10." }
  }

  await connectMongo()
  await writeClassroomComposites(weights)
  await Course.updateMany(
    { "recordConfigs.recordType": "CLASSROOM_LEARNING" },
    { $set: { "recordConfigs.$[slot].compositeWeights": weights } },
    { arrayFilters: [{ "slot.recordType": "CLASSROOM_LEARNING" }] }
  )
  await AuditLog.create({
    actorId: session.userId,
    action: "settings.classroomComposites",
    payload: weights,
  })
  updateTag("catalog")
  revalidatePath("/admin/settings")
  revalidatePath("/admin/courses")
  revalidatePath("/faculty")
  revalidatePath("/student")
  return { ok: true, message: "Classroom composite split saved. It now sums to 10." }
}

export async function createTerm(
  _prev: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return { ok: false, message: "Only Admin can create terms." }
  }

  const name = String(formData.get("name") ?? "").trim()
  const academicYear = String(formData.get("academicYear") ?? "").trim()
  const startsAt = String(formData.get("startsAt") ?? "").trim()
  const endsAt = String(formData.get("endsAt") ?? "").trim()
  if (!name) return { ok: false, message: "Term name is required." }
  if (!academicYear) return { ok: false, message: "Academic year is required." }
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: "Enter valid start and end dates." }
  }
  if (end <= start) {
    return { ok: false, message: "End date must be after the start date." }
  }

  await connectMongo()
  const existing = await Term.findOne({ academicYear, name })
  if (existing) {
    return { ok: false, message: "That term already exists for this academic year." }
  }
  await Term.create({ name, academicYear, startsAt: start, endsAt: end })
  await AuditLog.create({
    actorId: session.userId,
    action: "term.create",
    payload: { name, academicYear },
  })
  revalidatePath("/admin/settings")
  revalidatePath("/admin/courses")
  revalidatePath("/admin/courses/new")
  revalidatePath("/faculty/courses/new")
  return { ok: true, message: `${name} (${academicYear}) was added.` }
}
