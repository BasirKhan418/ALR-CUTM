"use server"

import { Types } from "mongoose"
import { revalidatePath } from "next/cache"
import { hasRole, requireSession, type AppSession } from "@/lib/auth/guards"
import { AuditLog } from "@/lib/db/models/audit-log"
import { Course } from "@/lib/db/models/course"
import { CreditLedger } from "@/lib/db/models/credit-ledger"
import { Enrollment } from "@/lib/db/models/enrollment"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { ProgramEvaluation } from "@/lib/db/models/program-evaluation"
import { Programme } from "@/lib/db/models/programme"
import { Signoff } from "@/lib/db/models/signoff"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { YearEvaluation } from "@/lib/db/models/year-evaluation"
import { connectMongo } from "@/lib/db/mongo"
import { cumulateYearMarks, describeCumulation } from "@/lib/domain/cumulate"
import type { Role } from "@/lib/domain/roles"
import {
  CREDIT_BASKET,
  CREDIT_PER_YEAR,
  CREDIT_SOURCE,
  EXAM_CELL_JOB,
  YEAR_CRITERIA,
  parseRubricMarks,
  rubricTotal,
  yearIsClosed,
} from "@/lib/domain/tiers"
import { exportsQueue } from "@/lib/queue/queues"
import { withSignoffLock } from "@/lib/signoff/lock"
import { readTierSettings, writeTierSettings } from "@/lib/tiers/settings"
import type { ExamCellJobData } from "@/lib/domain/exam-cell"

export type TierFormState = {
  ok: boolean
  message?: string
}

async function underSignoffLock(
  targetId: string,
  work: () => Promise<TierFormState>
): Promise<TierFormState> {
  const locked = await withSignoffLock(targetId, work)
  if (!locked.ok) return fail(locked.message)
  return locked.value
}

function fail(message: string): { ok: false; message: string } {
  return { ok: false, message }
}

function objectId(value: string) {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null
}

function duplicateKey(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
  )
}

function refresh() {
  revalidatePath("/dean/years", "layout")
  revalidatePath("/dean/program", "layout")
  revalidatePath("/dean/records", "layout")
  revalidatePath("/committee", "layout")
  revalidatePath("/student/credits")
  revalidatePath("/faculty/attainment", "layout")
  revalidatePath("/mentor/attainment", "layout")
  revalidatePath("/hod/years", "layout")
  revalidatePath("/admin/settings")
  revalidatePath("/admin/exports")
}

function deanOf(session: AppSession, campusId: string) {
  if (hasRole(session, "ADMIN")) return true
  return hasRole(session, "DEAN") && session.campusId === campusId
}

function signerRole(session: AppSession, committeeIds: string[]): Role {
  if (
    session.roles.includes("COMMITTEE_MEMBER") &&
    committeeIds.includes(session.userId)
  ) {
    return "COMMITTEE_MEMBER"
  }
  if (session.roles.includes("DEAN")) return "DEAN"
  return "ADMIN"
}

async function audit(actorId: string, action: string, payload: unknown) {
  await AuditLog.create({ actorId, action, payload })
}

async function appendSignoff(input: {
  campusId: string
  targetType: "YEAR_EVALUATION" | "PROGRAM_EVALUATION"
  targetId: string
  role: Role
  actorId: string
  reason: string
}) {
  const last = await Signoff.findOne({
    targetType: input.targetType,
    targetId: input.targetId,
  })
    .sort({ stepOrder: -1 })
    .lean()
  await Signoff.create({
    campusId: input.campusId,
    targetType: input.targetType,
    targetId: input.targetId,
    stepOrder: (last?.stepOrder ?? 0) + 1,
    role: input.role,
    actorId: input.actorId,
    decision: "APPROVED",
    reason: input.reason,
    at: new Date(),
  })
}

async function snapshotComponents(
  studentId: string,
  academicYear: string,
  campusId: string
) {
  const terms = await Term.find({ academicYear }).select("_id").lean()
  if (terms.length === 0) return []
  const termIds = terms.map((term) => term._id)
  const [entries, deliverables] = await Promise.all([
    LrEntry.find({ studentId, campusId, termId: { $in: termIds } }).select("_id").lean(),
    MajorDeliverable.find({
      candidateIds: studentId,
      campusId,
      termId: { $in: termIds },
    })
      .select("_id")
      .lean(),
  ])
  return [
    ...entries.map((entry) => ({ kind: "LR" as const, id: entry._id })),
    ...deliverables.map((item) => ({ kind: "DELIVERABLE" as const, id: item._id })),
  ]
}

async function committeeOnCampus(ids: string[], campusId: string) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0 || unique.some((id) => !objectId(id))) {
    return fail("Choose at least one committee member.")
  }
  const users = await User.find({
    _id: { $in: unique },
    campusId,
    roles: "COMMITTEE_MEMBER",
    active: true,
  }).lean()
  if (users.length !== unique.length) {
    return fail("Committee members must be active committee users on this campus.")
  }
  return { ok: true as const, ids: users.map((user) => user._id) }
}

function marksFromForm(formData: FormData) {
  return YEAR_CRITERIA.map((criterion) => ({
    criterionId: criterion.id,
    marks: Number(formData.get(`marks.${criterion.id}`)),
    comment: String(formData.get(`comment.${criterion.id}`) ?? ""),
  }))
}

async function insertYearCredit(input: {
  studentId: Types.ObjectId
  academicYear: string
  campusId: Types.ObjectId
  yearEvaluationId: Types.ObjectId
  postedBy: string
}) {
  try {
    await CreditLedger.create({
      studentId: input.studentId,
      academicYear: input.academicYear,
      source: CREDIT_SOURCE,
      credits: CREDIT_PER_YEAR,
      basket: CREDIT_BASKET,
      postedBy: input.postedBy,
      postedAt: new Date(),
      campusId: input.campusId,
      yearEvaluationId: input.yearEvaluationId,
    })
    return { ok: true as const }
  } catch (error) {
    if (duplicateKey(error)) {
      return fail("A credit is already posted for this student and year.")
    }
    throw error
  }
}

export async function updateTierSettings(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  if (!hasRole(session, "DEAN", "ADMIN")) {
    return fail("Dean or Admin can change the five-criterion settings.")
  }
  try {
    await writeTierSettings({
      yearWiseUsesFiveCriterion: formData.get("yearWiseUsesFiveCriterion") === "on",
      programWiseUsesFiveCriterion: formData.get("programWiseUsesFiveCriterion") === "on",
      programCumulateScale: Number(formData.get("programCumulateScale")),
    })
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not save settings.")
  }
  await audit(session.userId, "settings.tier-rubric", {
    yearWiseUsesFiveCriterion: formData.get("yearWiseUsesFiveCriterion") === "on",
    programWiseUsesFiveCriterion: formData.get("programWiseUsesFiveCriterion") === "on",
    programCumulateScale: Number(formData.get("programCumulateScale")),
  })
  refresh()
  return { ok: true, message: "Year and programme rubric settings saved." }
}

export async function constituteYearCommittee(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  await connectMongo()
  const campusId = String(formData.get("campusId") ?? "")
  const academicYear = String(formData.get("academicYear") ?? "").trim()
  const studentKey = objectId(String(formData.get("studentId") ?? ""))
  if (!studentKey || !academicYear) return fail("Choose a student and academic year.")
  if (!deanOf(session, campusId)) {
    return fail("Year committees are constituted for your campus.")
  }
  const picked = await committeeOnCampus(
    formData.getAll("committeeIds").map(String),
    campusId
  )
  if (!picked.ok) return picked

  const student = await User.findOne({
    _id: studentKey,
    campusId,
    roles: "STUDENT",
    active: true,
  })
  if (!student) return fail("That student is not active on this campus.")
  const programme = student.programmeId
    ? await Programme.findById(student.programmeId)
    : null
  if (!programme) {
    return fail("This student has no programme, so the expected ALR credits are unknown.")
  }

  const compiled = await snapshotComponents(String(student._id), academicYear, campusId)
  let year = await YearEvaluation.findOne({ studentId: student._id, academicYear })
  if (year && yearIsClosed(year.status)) {
    return fail("This year is already signed.")
  }
  if (!year) {
    try {
      year = await YearEvaluation.create({
        studentId: student._id,
        academicYear,
        campusId,
        departmentId: student.departmentId,
        programmeId: programme._id,
        compiledComponentIds: compiled,
        committeeIds: picked.ids,
        rubricScores: [],
        comments: "",
        facultyCoRefs: [],
        creditPosted: false,
        examCellExport: { status: "PENDING" },
        status: "COMMITTEE_ASSIGNED",
      })
    } catch (error) {
      if (duplicateKey(error)) return fail("This student already has that academic year.")
      throw error
    }
  } else {
    year.committeeIds = picked.ids
    year.compiledComponentIds = compiled
    year.programmeId = programme._id
    if (student.departmentId) year.departmentId = student.departmentId
    if (year.status === "DRAFT") year.status = "COMMITTEE_ASSIGNED"
    await year.save()
  }

  await appendSignoff({
    campusId,
    targetType: "YEAR_EVALUATION",
    targetId: String(year._id),
    role: "DEAN",
    actorId: session.userId,
    reason: "Year committee constituted.",
  })
  await audit(session.userId, "year.committee", {
    yearEvaluationId: String(year._id),
    academicYear,
    studentId: String(student._id),
    committeeIds: picked.ids.map(String),
  })
  refresh()
  return { ok: true, message: "Year committee assigned. Compiled records were refreshed." }
}

export async function scoreYearRubric(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  await connectMongo()
  const settings = await readTierSettings()
  if (!settings.yearWiseUsesFiveCriterion) {
    return fail("The year-wise five-criterion rubric is turned off.")
  }
  const year = await YearEvaluation.findById(String(formData.get("yearEvaluationId") ?? ""))
  if (!year) return fail("Year evaluation was not found.")
  if (!deanOf(session, String(year.campusId))) {
    const onCommittee =
      hasRole(session, "COMMITTEE_MEMBER") &&
      year.committeeIds.some((id: { toString(): string }) => String(id) === session.userId)
    if (!onCommittee) return fail("Only the assigned committee or Dean can score this year.")
  }
  if (year.status !== "COMMITTEE_ASSIGNED" && year.status !== "SCORED") {
    return fail("Score the rubric after the committee is assigned and before sign-off.")
  }
  const parsed = parseRubricMarks(marksFromForm(formData))
  if (!parsed.ok) return parsed
  year.rubricScores = parsed.scores
  year.comments = String(formData.get("comments") ?? "").trim()
  year.status = "SCORED"
  await year.save()
  await appendSignoff({
    campusId: String(year.campusId),
    targetType: "YEAR_EVALUATION",
    targetId: String(year._id),
    role: signerRole(session, year.committeeIds.map((id: { toString(): string }) => String(id))),
    actorId: session.userId,
    reason: `Five-criterion rubric scored. Total ${rubricTotal(parsed.scores)} / 100.`,
  })
  await audit(session.userId, "year.score", {
    yearEvaluationId: String(year._id),
    total: rubricTotal(parsed.scores),
  })
  refresh()
  return { ok: true, message: `Rubric saved. Total ${rubricTotal(parsed.scores)} / 100.` }
}

export async function signYear(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  await connectMongo()
  const settings = await readTierSettings()
  const year = await YearEvaluation.findById(String(formData.get("yearEvaluationId") ?? ""))
  if (!year) return fail("Year evaluation was not found.")
  const campusId = String(year.campusId)
  const onCommittee =
    hasRole(session, "COMMITTEE_MEMBER") &&
    year.committeeIds.some((id: { toString(): string }) => String(id) === session.userId)
  if (!deanOf(session, campusId) && !onCommittee) {
    return fail("Only the assigned committee or Dean can sign this year.")
  }
  if (yearIsClosed(year.status)) return fail("This year is already signed.")
  if (settings.yearWiseUsesFiveCriterion) {
    if (year.status !== "SCORED" || rubricTotal(year.rubricScores) === null) {
      return fail("Score the five-criterion rubric before signing the year.")
    }
  } else if (year.status !== "COMMITTEE_ASSIGNED" && year.status !== "SCORED") {
    return fail("Assign the committee before signing the year.")
  }

  return underSignoffLock(String(year._id), async () => {
    const posted = await insertYearCredit({
      studentId: year.studentId,
      academicYear: year.academicYear,
      campusId: year.campusId,
      yearEvaluationId: year._id,
      postedBy: session.userId,
    })
    if (!posted.ok) return posted

    year.status = "SIGNED"
    year.creditPosted = true
    await year.save()
    await appendSignoff({
      campusId,
      targetType: "YEAR_EVALUATION",
      targetId: String(year._id),
      role: signerRole(session, year.committeeIds.map((id: { toString(): string }) => String(id))),
      actorId: session.userId,
      reason: "Year signed. 1 ALR credit posted to the Compulsory Basket.",
    })
    await audit(session.userId, "year.sign", {
      yearEvaluationId: String(year._id),
      credits: CREDIT_PER_YEAR,
    })
    refresh()
    return {
      ok: true,
      message: "Year signed. 1 ALR credit is now on the Compulsory Basket.",
    }
  })
}

export async function postYearCredit(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  await connectMongo()
  const year = await YearEvaluation.findById(String(formData.get("yearEvaluationId") ?? ""))
  if (!year) return fail("Year evaluation was not found.")
  if (!deanOf(session, String(year.campusId))) {
    return fail("Dean posts the year credit.")
  }
  if (!yearIsClosed(year.status)) return fail("Sign the year before posting credit.")
  if (year.creditPosted) {
    return fail("A credit is already posted for this student and year.")
  }
  return underSignoffLock(String(year._id), async () => {
    const posted = await insertYearCredit({
      studentId: year.studentId,
      academicYear: year.academicYear,
      campusId: year.campusId,
      yearEvaluationId: year._id,
      postedBy: session.userId,
    })
    if (!posted.ok) return posted
    year.creditPosted = true
    await year.save()
    await audit(session.userId, "year.credit", { yearEvaluationId: String(year._id) })
    refresh()
    return { ok: true, message: "1 ALR credit posted to the Compulsory Basket." }
  })
}

export async function exportYearToExamCell(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  await connectMongo()
  const year = await YearEvaluation.findById(String(formData.get("yearEvaluationId") ?? ""))
  if (!year) return fail("Year evaluation was not found.")
  if (!deanOf(session, String(year.campusId))) {
    return fail("Dean exports the year to the exam cell.")
  }
  if (!yearIsClosed(year.status) || !year.creditPosted) {
    return fail("Sign the year and post its credit before the exam-cell export.")
  }
  year.examCellExport = { ...year.examCellExport, status: "QUEUED" }
  await year.save()
  const payload: ExamCellJobData = {
    campusId: String(year.campusId),
    academicYear: year.academicYear,
    yearEvaluationId: String(year._id),
  }
  await exportsQueue().add(EXAM_CELL_JOB, payload)
  await audit(session.userId, "year.export", payload)
  refresh()
  return {
    ok: true,
    message: "Exam-cell export queued. The worker writes the JSON file.",
  }
}

export async function signYearPoPso(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  if (!hasRole(session, "MENTOR")) {
    return fail("PO/PSO attainment requires the Mentor role.")
  }
  await connectMongo()
  const year = await YearEvaluation.findById(String(formData.get("yearEvaluationId") ?? ""))
  if (!year) return fail("Year evaluation was not found.")
  if (session.campusId !== String(year.campusId) && !hasRole(session, "ADMIN")) {
    return fail("This year is on another campus.")
  }
  if (year.status === "DRAFT") return fail("The year committee has not been assigned.")
  if (year.mentorPoPso?.signedBy) return fail("PO/PSO is already signed for this year.")
  const enrollments = await Enrollment.find({ studentId: year.studentId }).select("courseId").lean()
  const assignment = await FacultyAssignment.findOne({
    userId: session.userId,
    role: "MENTOR",
    courseId: { $in: enrollments.map((item) => item.courseId) },
  }).lean()
  if (!assignment) {
    return fail("You are not the PO/PSO mentor for this student.")
  }
  const sheet = String(formData.get("sheet") ?? "").trim()
  if (!sheet) return fail("Write the PO/PSO attainment note.")
  return underSignoffLock(String(year._id), async () => {
    year.mentorPoPso = { signedBy: objectId(session.userId) ?? undefined, at: new Date(), sheet }
    await year.save()
    await appendSignoff({
      campusId: String(year.campusId),
      targetType: "YEAR_EVALUATION",
      targetId: String(year._id),
      role: "MENTOR",
      actorId: session.userId,
      reason: sheet,
    })
    await audit(session.userId, "year.po-pso", { yearEvaluationId: String(year._id) })
    refresh()
    return { ok: true, message: "PO/PSO attainment signed." }
  })
}

export async function signYearCo(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  if (!hasRole(session, "FACULTY")) {
    return fail("CO attainment is signed by course faculty.")
  }
  await connectMongo()
  const year = await YearEvaluation.findById(String(formData.get("yearEvaluationId") ?? ""))
  const courseId = objectId(String(formData.get("courseId") ?? ""))
  if (!year || !courseId) return fail("Choose a course on this year.")
  if (year.status === "DRAFT") return fail("The year committee has not been assigned.")
  if (year.facultyCoRefs.some((ref: { courseId?: unknown }) => String(ref.courseId) === String(courseId))) {
    return fail("CO attainment is already signed for this course.")
  }
  const course = await Course.findById(courseId).lean()
  if (!course) return fail("Course was not found.")
  const terms = await Term.find({ academicYear: year.academicYear }).select("_id").lean()
  const enrolled = await Enrollment.findOne({
    studentId: year.studentId,
    courseId,
    termId: { $in: terms.map((term) => term._id) },
  }).lean()
  if (!enrolled) return fail("This student is not enrolled in that course for the year.")
  const assigned = await FacultyAssignment.findOne({
    courseId,
    userId: session.userId,
    role: "FACULTY",
  }).lean()
  if (!assigned && !hasRole(session, "ADMIN")) {
    return fail("Only faculty assigned to this course can sign CO attainment.")
  }
  const sheet = String(formData.get("sheet") ?? "").trim()
  return underSignoffLock(String(year._id), async () => {
    year.facultyCoRefs.push({
      courseId,
      signedBy: new Types.ObjectId(session.userId),
      at: new Date(),
      sheet,
    })
    await year.save()
    await appendSignoff({
      campusId: String(year.campusId),
      targetType: "YEAR_EVALUATION",
      targetId: String(year._id),
      role: "FACULTY",
      actorId: session.userId,
      reason: sheet || `CO attainment signed for ${course.code}.`,
    })
    await audit(session.userId, "year.co", {
      yearEvaluationId: String(year._id),
      courseId: String(courseId),
    })
    refresh()
    return { ok: true, message: `CO attainment signed for ${course.code}.` }
  })
}

async function closedYears(studentId: Types.ObjectId) {
  const years = await YearEvaluation.find({ studentId }).sort({ academicYear: 1 })
  const open = years.find((year) => !yearIsClosed(year.status))
  return { years, open }
}

export async function constituteProgramCommittee(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  await connectMongo()
  const campusId = String(formData.get("campusId") ?? "")
  const studentKey = objectId(String(formData.get("studentId") ?? ""))
  if (!studentKey) return fail("Choose a student.")
  if (!deanOf(session, campusId)) {
    return fail("Programme committees are constituted for your campus.")
  }
  const picked = await committeeOnCampus(
    formData.getAll("committeeIds").map(String),
    campusId
  )
  if (!picked.ok) return picked
  const student = await User.findOne({
    _id: studentKey,
    campusId,
    roles: "STUDENT",
    active: true,
  })
  if (!student?.programmeId) return fail("This student has no programme.")
  const { years, open } = await closedYears(student._id)
  if (years.length === 0) return fail("This student has no year evaluations.")
  if (open) return fail(`${open.academicYear} is still open. Sign every year first.`)

  let program = await ProgramEvaluation.findOne({ studentId: student._id })
  if (program && yearIsClosed(program.status)) {
    return fail("This programme evaluation is already signed.")
  }
  if (!program) {
    program = await ProgramEvaluation.create({
      studentId: student._id,
      campusId,
      departmentId: student.departmentId,
      programmeId: student.programmeId,
      yearEvaluationIds: years.map((year) => year._id),
      committeeIds: picked.ids,
      rubricScores: [],
      comments: "",
      examCellExport: { status: "PENDING" },
      status: "COMMITTEE_ASSIGNED",
    })
  } else {
    program.committeeIds = picked.ids
    program.yearEvaluationIds = years.map((year) => year._id)
    if (program.status === "DRAFT") program.status = "COMMITTEE_ASSIGNED"
    await program.save()
  }
  await appendSignoff({
    campusId,
    targetType: "PROGRAM_EVALUATION",
    targetId: String(program._id),
    role: "DEAN",
    actorId: session.userId,
    reason: "Programme committee constituted.",
  })
  await audit(session.userId, "program.committee", {
    programEvaluationId: String(program._id),
    studentId: String(student._id),
  })
  refresh()
  return { ok: true, message: "Programme committee assigned." }
}

export async function cumulateProgram(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  await connectMongo()
  const program = await ProgramEvaluation.findById(
    String(formData.get("programEvaluationId") ?? "")
  )
  if (!program) return fail("Programme evaluation was not found.")
  if (!deanOf(session, String(program.campusId))) {
    return fail("Dean cumulates the programme mark.")
  }
  if (yearIsClosed(program.status)) return fail("This programme evaluation is already signed.")
  const settings = await readTierSettings()
  const { years, open } = await closedYears(program.studentId)
  if (open) return fail(`${open.academicYear} is still open. Sign every year first.`)
  const missing = years.find((year) => rubricTotal(year.rubricScores) === null)
  if (missing) {
    return fail(`${missing.academicYear} has no year rubric total to cumulate.`)
  }
  const totals = years.map((year) => rubricTotal(year.rubricScores) ?? 0)
  const mark = cumulateYearMarks(totals, settings.programCumulateScale)
  const sentence = describeCumulation(totals, settings.programCumulateScale)
  program.yearEvaluationIds = years.map((year) => year._id)
  program.cumulatedMark = mark
  program.scaleUsed = settings.programCumulateScale
  if (!settings.programWiseUsesFiveCriterion) {
    program.finalMark = mark
    program.status = "SCORED"
  } else if (rubricTotal(program.rubricScores) !== null) {
    program.finalMark = rubricTotal(program.rubricScores) ?? mark
    program.status = "SCORED"
  }
  await program.save()
  await appendSignoff({
    campusId: String(program.campusId),
    targetType: "PROGRAM_EVALUATION",
    targetId: String(program._id),
    role: "DEAN",
    actorId: session.userId,
    reason: sentence,
  })
  await audit(session.userId, "program.cumulate", {
    programEvaluationId: String(program._id),
    cumulatedMark: mark,
    scale: settings.programCumulateScale,
  })
  refresh()
  return { ok: true, message: sentence }
}

export async function scoreProgramRubric(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  await connectMongo()
  const settings = await readTierSettings()
  if (!settings.programWiseUsesFiveCriterion) {
    return fail("The programme five-criterion rubric is turned off.")
  }
  const program = await ProgramEvaluation.findById(
    String(formData.get("programEvaluationId") ?? "")
  )
  if (!program) return fail("Programme evaluation was not found.")
  const onCommittee =
    hasRole(session, "COMMITTEE_MEMBER") &&
    program.committeeIds.some((id: { toString(): string }) => String(id) === session.userId)
  if (!deanOf(session, String(program.campusId)) && !onCommittee) {
    return fail("Only the assigned committee or Dean can score this programme.")
  }
  if (program.status !== "COMMITTEE_ASSIGNED" && program.status !== "SCORED") {
    return fail("Score the programme after the committee is assigned and before sign-off.")
  }
  const parsed = parseRubricMarks(marksFromForm(formData))
  if (!parsed.ok) return parsed
  const total = rubricTotal(parsed.scores)
  program.rubricScores = parsed.scores
  program.comments = String(formData.get("comments") ?? "").trim()
  program.finalMark = total ?? undefined
  program.status = "SCORED"
  await program.save()
  await appendSignoff({
    campusId: String(program.campusId),
    targetType: "PROGRAM_EVALUATION",
    targetId: String(program._id),
    role: signerRole(session, program.committeeIds.map((id: { toString(): string }) => String(id))),
    actorId: session.userId,
    reason: `Programme rubric scored. Total ${total} / 100.`,
  })
  await audit(session.userId, "program.score", {
    programEvaluationId: String(program._id),
    total,
  })
  refresh()
  return { ok: true, message: `Programme rubric saved. Total ${total} / 100.` }
}

export async function signProgram(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  await connectMongo()
  const settings = await readTierSettings()
  const program = await ProgramEvaluation.findById(
    String(formData.get("programEvaluationId") ?? "")
  )
  if (!program) return fail("Programme evaluation was not found.")
  const onCommittee =
    hasRole(session, "COMMITTEE_MEMBER") &&
    program.committeeIds.some((id: { toString(): string }) => String(id) === session.userId)
  if (!deanOf(session, String(program.campusId)) && !onCommittee) {
    return fail("Only the assigned committee or Dean can sign this programme.")
  }
  if (yearIsClosed(program.status)) return fail("This programme evaluation is already signed.")
  if (program.cumulatedMark == null) {
    return fail("Cumulate the signed year marks before signing the programme.")
  }
  if (settings.programWiseUsesFiveCriterion && rubricTotal(program.rubricScores) === null) {
    return fail("Score the five-criterion rubric before signing the programme.")
  }
  if (program.status !== "SCORED") {
    return fail("Score the programme before signing it.")
  }
  return underSignoffLock(String(program._id), async () => {
    program.status = "SIGNED"
    if (program.finalMark == null) program.finalMark = program.cumulatedMark
    await program.save()
    await appendSignoff({
      campusId: String(program.campusId),
      targetType: "PROGRAM_EVALUATION",
      targetId: String(program._id),
      role: signerRole(session, program.committeeIds.map((id: { toString(): string }) => String(id))),
      actorId: session.userId,
      reason: `Programme signed. Cumulated mark ${program.cumulatedMark}. Final mark ${program.finalMark}.`,
    })
    await audit(session.userId, "program.sign", { programEvaluationId: String(program._id) })
    refresh()
    return { ok: true, message: "Programme evaluation signed." }
  })
}

export async function exportProgramToExamCell(
  _prev: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const session = await requireSession()
  await connectMongo()
  const program = await ProgramEvaluation.findById(
    String(formData.get("programEvaluationId") ?? "")
  )
  if (!program) return fail("Programme evaluation was not found.")
  if (!deanOf(session, String(program.campusId))) {
    return fail("Dean exports the programme to the exam cell.")
  }
  if (!yearIsClosed(program.status)) {
    return fail("Sign the programme before the exam-cell export.")
  }
  program.examCellExport = { ...program.examCellExport, status: "QUEUED" }
  await program.save()
  const payload: ExamCellJobData = {
    campusId: String(program.campusId),
    programEvaluationId: String(program._id),
  }
  await exportsQueue().add(EXAM_CELL_JOB, payload)
  await audit(session.userId, "program.export", payload)
  refresh()
  return {
    ok: true,
    message: "Programme exam-cell export queued. The worker writes the JSON file.",
  }
}
