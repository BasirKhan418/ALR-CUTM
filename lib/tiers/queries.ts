import { Campus } from "@/lib/db/models/campus"
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
import { YearEvaluation, type RubricScore } from "@/lib/db/models/year-evaluation"
import { connectMongo } from "@/lib/db/mongo"
import { cumulateYearMarks, describeCumulation } from "@/lib/domain/cumulate"
import { recordTypeLabel } from "@/lib/domain/record-types"
import {
  BASKET_LABEL,
  CREDIT_SOURCE,
  YEAR_CRITERIA,
  rubricTotal,
  yearIsClosed,
  yearStatusLabel,
} from "@/lib/domain/tiers"
import { roleLabel } from "@/lib/ui/format"
import type {
  Audience,
  ComponentView,
  CourseCoView,
  PersonOption,
  ProgramBoardRow,
  ProgramDetail,
  SignoffView,
  StudentCreditsView,
  YearBoardRow,
  YearDetail,
  YearQueueRow,
} from "@/lib/tiers/types"

function componentHref(audience: Audience, kind: "LR" | "DELIVERABLE", id: string) {
  if (kind === "LR") {
    return audience === "faculty"
      ? `/faculty/inbox/${id}`
      : `/dean/records/lr/${id}`
  }
  if (audience === "faculty") return `/faculty/deliverables/${id}`
  if (audience === "hod") return `/hod/${id}`
  if (audience === "dean") return `/dean/${id}`
  return `/dean/records/deliverable/${id}`
}

async function signoffViews(
  targetType: "YEAR_EVALUATION" | "PROGRAM_EVALUATION",
  targetId: string
): Promise<SignoffView[]> {
  const steps = await Signoff.find({ targetType, targetId }).sort({ stepOrder: 1 }).lean()
  const actorIds = steps.map((step) => step.actorId).filter(Boolean)
  const actors = await User.find({ _id: { $in: actorIds } }).lean()
  const actorById = new Map(actors.map((actor) => [String(actor._id), actor.name]))
  return steps.map((step) => ({
    id: String(step._id),
    role: roleLabel(step.role),
    actorName: step.actorId ? actorById.get(String(step.actorId)) ?? "User" : "—",
    at: step.at ? step.at.toISOString() : null,
    reason: step.reason ?? "",
  }))
}

async function coursesInYear(studentId: string, academicYear: string) {
  const terms = await Term.find({ academicYear }).select("_id").lean()
  if (terms.length === 0) return []
  const enrollments = await Enrollment.find({
    studentId,
    termId: { $in: terms.map((term) => term._id) },
  }).lean()
  if (enrollments.length === 0) return []
  const courses = await Course.find({
    _id: { $in: enrollments.map((item) => item.courseId) },
  }).lean()
  const assignments = await FacultyAssignment.find({
    courseId: { $in: courses.map((course) => course._id) },
    role: "FACULTY",
  }).lean()
  return courses.map((course) => ({
    id: String(course._id),
    code: course.code,
    title: course.title,
    facultyIds: assignments
      .filter((item) => String(item.courseId) === String(course._id))
      .map((item) => String(item.userId)),
  }))
}

async function mentorIdsForStudent(studentId: string) {
  const enrollments = await Enrollment.find({ studentId }).select("courseId").lean()
  if (enrollments.length === 0) return []
  const assignments = await FacultyAssignment.find({
    courseId: { $in: enrollments.map((item) => item.courseId) },
    role: "MENTOR",
  }).lean()
  return [...new Set(assignments.map((item) => String(item.userId)))]
}

export async function listAcademicYears() {
  await connectMongo()
  const [termYears, evalYears] = await Promise.all([
    Term.distinct("academicYear"),
    YearEvaluation.distinct("academicYear"),
  ])
  return [...new Set([...termYears, ...evalYears].map(String))].sort()
}

export async function listCampusOptions() {
  await connectMongo()
  const rows = await Campus.find({ active: true }).sort({ name: 1 }).lean()
  return rows.map((campus) => ({
    id: String(campus._id),
    name: campus.name,
  }))
}

export async function listCommitteeMembers(campusId: string): Promise<PersonOption[]> {
  await connectMongo()
  const users = await User.find({
    campusId,
    roles: "COMMITTEE_MEMBER",
    active: true,
  })
    .sort({ name: 1 })
    .lean()
  return users.map((user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
  }))
}

export async function loadYearBoard(
  campusId: string,
  academicYear: string
): Promise<YearBoardRow[]> {
  await connectMongo()
  const students = await User.find({ campusId, roles: "STUDENT", active: true })
    .sort({ name: 1 })
    .lean()
  const [evals, programmes] = await Promise.all([
    YearEvaluation.find({ campusId, academicYear }).lean(),
    Programme.find({
      _id: { $in: students.map((student) => student.programmeId).filter(Boolean) },
    }).lean(),
  ])
  const evalByStudent = new Map(evals.map((row) => [String(row.studentId), row]))
  const programmeById = new Map(programmes.map((row) => [String(row._id), row]))
  return students.map((student) => {
    const row = evalByStudent.get(String(student._id))
    const programme = student.programmeId
      ? programmeById.get(String(student.programmeId))
      : undefined
    return {
      studentId: String(student._id),
      studentName: student.name,
      registrationNo: student.registrationNo ?? "",
      programmeName: programme?.name ?? "No programme",
      durationYears: programme?.durationYears ?? null,
      evaluationId: row ? String(row._id) : null,
      status: row?.status ?? null,
      rubricTotal: row ? rubricTotal(row.rubricScores) : null,
      creditPosted: Boolean(row?.creditPosted),
      exportStatus: row?.examCellExport?.status ?? "PENDING",
    }
  })
}

export async function loadYearDetail(
  id: string,
  audience: Audience
): Promise<YearDetail | null> {
  await connectMongo()
  const year = await YearEvaluation.findById(id).lean()
  if (!year) return null
  const [student, campus, programme, committee, mentorUserIds, yearCourses, components, signoffs] =
    await Promise.all([
      User.findById(year.studentId).lean(),
      Campus.findById(year.campusId).lean(),
      Programme.findById(year.programmeId).lean(),
      User.find({ _id: { $in: year.committeeIds } }).lean(),
      mentorIdsForStudent(String(year.studentId)),
      coursesInYear(String(year.studentId), year.academicYear),
      componentViews(year.compiledComponentIds, audience),
      signoffViews("YEAR_EVALUATION", String(year._id)),
    ])
  const coActorIds = year.facultyCoRefs.map((ref: { signedBy?: unknown }) => ref.signedBy)
  const mentorId = year.mentorPoPso?.signedBy
  const people = await User.find({
    _id: { $in: [...coActorIds, mentorId].filter(Boolean) },
  }).lean()
  const nameById = new Map(people.map((person) => [String(person._id), person.name]))
  const courses: CourseCoView[] = yearCourses.map((course) => {
    const ref = year.facultyCoRefs.find(
      (item: { courseId?: unknown; signedBy?: unknown; at?: Date; sheet?: string }) =>
        String(item.courseId) === course.id
    )
    return {
      ...course,
      coSigned: Boolean(ref),
      coSignedBy: ref ? nameById.get(String(ref.signedBy)) ?? "Faculty" : "",
      coAt: ref?.at ? ref.at.toISOString() : null,
      coSheet: ref?.sheet ?? "",
    }
  })
  const scoreById = new Map(
    (year.rubricScores as RubricScore[]).map((row) => [row.criterionId, row])
  )
  return {
    id: String(year._id),
    studentId: String(year.studentId),
    studentName: student?.name ?? "Student",
    studentEmail: student?.email ?? "",
    registrationNo: student?.registrationNo ?? "",
    academicYear: year.academicYear,
    campusId: String(year.campusId),
    campusName: campus?.name ?? "Campus",
    departmentId: year.departmentId ? String(year.departmentId) : "",
    programmeName: programme?.name ?? "Programme",
    durationYears: programme?.durationYears ?? 0,
    status: year.status,
    committeeIds: year.committeeIds.map(String),
    committeeNames: committee.map((person) => person.name),
    components,
    courses,
    rubric: YEAR_CRITERIA.map((criterion) => {
      const row = scoreById.get(criterion.id)
      return {
        criterionId: criterion.id,
        label: criterion.label,
        max: criterion.max,
        marks: row ? row.marks : null,
        comment: row?.comment ?? "",
      }
    }),
    rubricTotal: rubricTotal(year.rubricScores),
    comments: year.comments ?? "",
    mentorSigned: Boolean(year.mentorPoPso?.signedBy),
    mentorName: mentorId ? nameById.get(String(mentorId)) ?? "Mentor" : "",
    mentorAt: year.mentorPoPso?.at ? year.mentorPoPso.at.toISOString() : null,
    mentorSheet: year.mentorPoPso?.sheet ?? "",
    mentorUserIds,
    creditPosted: year.creditPosted,
    exportStatus: year.examCellExport?.status ?? "PENDING",
    signoffs,
  }
}

async function componentViews(
  compiled: { kind: "LR" | "DELIVERABLE"; id: unknown }[],
  audience: Audience
): Promise<ComponentView[]> {
  const lrIds = compiled.filter((item) => item.kind === "LR").map((item) => item.id)
  const deliverableIds = compiled
    .filter((item) => item.kind === "DELIVERABLE")
    .map((item) => item.id)
  const [entries, deliverables] = await Promise.all([
    LrEntry.find({ _id: { $in: lrIds } }).lean(),
    MajorDeliverable.find({ _id: { $in: deliverableIds } }).lean(),
  ])
  const courses = await Course.find({
    _id: {
      $in: [...entries.map((entry) => entry.courseId), ...deliverables.map((item) => item.courseId)],
    },
  }).lean()
  const courseById = new Map(courses.map((course) => [String(course._id), course]))
  const lrViews: ComponentView[] = entries.map((entry) => {
    const course = courseById.get(String(entry.courseId))
    const title = entry.title || entry.topic || entry.taskTitle || "Learning record"
    return {
      kind: "LR",
      id: String(entry._id),
      href: componentHref(audience, "LR", String(entry._id)),
      label: course?.code ?? "Course",
      detail: `${recordTypeLabel(entry.recordType)} · ${title}`,
    }
  })
  const deliverableViews: ComponentView[] = deliverables.map((item) => {
    const course = courseById.get(String(item.courseId))
    return {
      kind: "DELIVERABLE",
      id: String(item._id),
      href: componentHref(audience, "DELIVERABLE", String(item._id)),
      label: course?.code ?? item.type,
      detail: `${item.type.replaceAll("_", " ")} · ${item.title || "Untitled"} · ${item.status}`,
    }
  })
  return [...lrViews, ...deliverableViews]
}

export async function loadStudentCredits(studentId: string): Promise<StudentCreditsView> {
  await connectMongo()
  const user = await User.findById(studentId).lean()
  const [programme, ledger, years] = await Promise.all([
    user?.programmeId ? Programme.findById(user.programmeId).lean() : null,
    CreditLedger.find({ studentId, source: CREDIT_SOURCE }).sort({ academicYear: 1 }).lean(),
    YearEvaluation.find({ studentId }).lean(),
  ])
  const yearByAcademic = new Map(years.map((year) => [year.academicYear, year]))
  const posted = ledger.reduce((sum, row) => sum + row.credits, 0)
  const expected = programme?.durationYears ?? null
  return {
    basket: BASKET_LABEL,
    posted,
    expected,
    label: expected && expected > 0 ? `${posted} / ${expected}` : String(posted),
    programmeName: programme?.name ?? "Programme not set",
    rows: ledger.map((row) => ({
      academicYear: row.academicYear,
      credits: row.credits,
      postedAt: row.postedAt.toISOString(),
      exportStatus: yearByAcademic.get(row.academicYear)?.examCellExport?.status ?? "PENDING",
    })),
  }
}

async function queueRows(
  years: {
    _id: unknown
    studentId: unknown
    academicYear: string
    status: YearDetail["status"]
    rubricScores: { criterionId: string; marks: number }[]
    mentorPoPso?: { signedBy?: unknown }
    facultyCoRefs: { courseId: unknown }[]
  }[],
  hrefBase: string,
  facultyCourseIds?: Set<string>
): Promise<YearQueueRow[]> {
  const students = await User.find({
    _id: { $in: years.map((year) => year.studentId) },
  }).lean()
  const studentById = new Map(students.map((student) => [String(student._id), student.name]))
  return Promise.all(
    years.map(async (year) => {
      const courses = await coursesInYear(String(year.studentId), year.academicYear)
      const mine = facultyCourseIds
        ? courses.filter((course) => facultyCourseIds.has(course.id))
        : courses
      const signed = mine.filter((course) =>
        year.facultyCoRefs.some((ref) => String(ref.courseId) === course.id)
      )
      return {
        id: String(year._id),
        studentName: studentById.get(String(year.studentId)) ?? "Student",
        academicYear: year.academicYear,
        status: year.status,
        rubricTotal: rubricTotal(year.rubricScores),
        mentorSigned: Boolean(year.mentorPoPso?.signedBy),
        coSigned: signed.length,
        coTotal: mine.length,
        href: `${hrefBase}/${String(year._id)}`,
      }
    })
  )
}

export async function listMentorYears(userId: string, campusId: string) {
  await connectMongo()
  const assignments = await FacultyAssignment.find({ userId, role: "MENTOR" }).lean()
  const enrollments = await Enrollment.find({
    courseId: { $in: assignments.map((item) => item.courseId) },
  }).lean()
  const studentIds = [...new Set(enrollments.map((item) => String(item.studentId)))]
  const years = await YearEvaluation.find({
    campusId,
    studentId: { $in: studentIds },
    status: { $ne: "DRAFT" },
  })
    .sort({ academicYear: -1 })
    .lean()
  return queueRows(years, "/mentor/attainment")
}

export async function listFacultyYears(userId: string, campusId: string) {
  await connectMongo()
  const assignments = await FacultyAssignment.find({ userId, role: "FACULTY" }).lean()
  const courseIds = new Set(assignments.map((item) => String(item.courseId)))
  const enrollments = await Enrollment.find({
    courseId: { $in: assignments.map((item) => item.courseId) },
  }).lean()
  const studentIds = [...new Set(enrollments.map((item) => String(item.studentId)))]
  const years = await YearEvaluation.find({
    campusId,
    studentId: { $in: studentIds },
    status: { $ne: "DRAFT" },
  })
    .sort({ academicYear: -1 })
    .lean()
  return queueRows(years, "/faculty/attainment", courseIds)
}

export async function listHodYears(campusId: string, departmentId: string | null) {
  await connectMongo()
  if (!departmentId) return []
  const years = await YearEvaluation.find({ campusId, departmentId })
    .sort({ academicYear: -1 })
    .lean()
  return queueRows(years, "/hod/years")
}

export async function listCommitteeWork(userId: string) {
  await connectMongo()
  const [years, programs] = await Promise.all([
    YearEvaluation.find({ committeeIds: userId }).sort({ academicYear: -1 }).lean(),
    ProgramEvaluation.find({ committeeIds: userId }).lean(),
  ])
  const yearRows = await queueRows(years, "/committee/years")
  const students = await User.find({
    _id: { $in: programs.map((row) => row.studentId) },
  }).lean()
  const studentById = new Map(students.map((student) => [String(student._id), student.name]))
  return {
    years: yearRows,
    programs: programs.map((row) => ({
      id: String(row._id),
      studentName: studentById.get(String(row.studentId)) ?? "Student",
      status: row.status,
      cumulatedMark: row.cumulatedMark ?? null,
      finalMark: row.finalMark ?? null,
      href: `/committee/program/${String(row._id)}`,
    })),
  }
}

export async function loadProgramBoard(campusId: string, scale: number) {
  await connectMongo()
  const students = await User.find({ campusId, roles: "STUDENT", active: true }).lean()
  const [years, programs, programmes] = await Promise.all([
    YearEvaluation.find({ campusId }).lean(),
    ProgramEvaluation.find({ campusId }).lean(),
    Programme.find({
      _id: { $in: students.map((student) => student.programmeId).filter(Boolean) },
    }).lean(),
  ])
  const programmeById = new Map(programmes.map((row) => [String(row._id), row]))
  const programByStudent = new Map(programs.map((row) => [String(row.studentId), row]))
  const ready: ProgramBoardRow[] = []
  const held: { studentName: string; reason: string }[] = []

  for (const student of students) {
    const own = years.filter((year) => String(year.studentId) === String(student._id))
    if (own.length === 0) continue
    const programme = student.programmeId
      ? programmeById.get(String(student.programmeId))
      : undefined
    const open = own.find((year) => !yearIsClosed(year.status))
    if (open || !programme) {
      held.push({
        studentName: student.name,
        reason: open
          ? `${open.academicYear} is still ${yearStatusLabel(open.status)}.`
          : "No programme is set, so duration and cumulation stay blocked.",
      })
      continue
    }
    const closed = [...own].sort((a, b) => a.academicYear.localeCompare(b.academicYear))
    const totals = closed.map((year) => rubricTotal(year.rubricScores) ?? 0)
    const evaluation = programByStudent.get(String(student._id))
    ready.push({
      studentId: String(student._id),
      studentName: student.name,
      registrationNo: student.registrationNo ?? "",
      programmeName: programme.name,
      durationYears: programme.durationYears,
      signedYears: closed.length,
      yearTotals: totals,
      formula: describeCumulation(totals, scale),
      cumulatedPreview: cumulateYearMarks(totals, scale),
      evaluationId: evaluation ? String(evaluation._id) : null,
      status: evaluation?.status ?? null,
      cumulatedMark: evaluation?.cumulatedMark ?? null,
      finalMark: evaluation?.finalMark ?? null,
    })
  }

  ready.sort((a, b) => a.studentName.localeCompare(b.studentName))
  return { ready, held }
}

export async function loadProgramDetail(
  id: string,
  scale = 100
): Promise<ProgramDetail | null> {
  await connectMongo()
  const program = await ProgramEvaluation.findById(id).lean()
  if (!program) return null
  const [student, campus, programme, committee, years, ledger, signoffs] = await Promise.all([
    User.findById(program.studentId).lean(),
    Campus.findById(program.campusId).lean(),
    Programme.findById(program.programmeId).lean(),
    User.find({ _id: { $in: program.committeeIds } }).lean(),
    YearEvaluation.find({ studentId: program.studentId }).sort({ academicYear: 1 }).lean(),
    CreditLedger.find({ studentId: program.studentId, source: CREDIT_SOURCE }).lean(),
    signoffViews("PROGRAM_EVALUATION", String(program._id)),
  ])
  const closed = years.filter((year) => yearIsClosed(year.status))
  const totals = closed.map((year) => rubricTotal(year.rubricScores) ?? 0)
  const appliedScale = program.scaleUsed ?? scale
  const scoreById = new Map(
    (program.rubricScores as RubricScore[]).map((row) => [row.criterionId, row])
  )
  return {
    id: String(program._id),
    studentId: String(program.studentId),
    studentName: student?.name ?? "Student",
    registrationNo: student?.registrationNo ?? "",
    academicYearsLabel: closed.map((year) => year.academicYear).join(", "),
    campusId: String(program.campusId),
    campusName: campus?.name ?? "Campus",
    programmeName: programme?.name ?? "Programme",
    durationYears: programme?.durationYears ?? 0,
    status: program.status,
    committeeIds: program.committeeIds.map(String),
    committeeNames: committee.map((person) => person.name),
    years: years.map((year) => ({
      id: String(year._id),
      academicYear: year.academicYear,
      status: year.status,
      rubricTotal: rubricTotal(year.rubricScores),
      creditPosted: year.creditPosted,
    })),
    yearTotals: totals,
    formula: describeCumulation(totals, appliedScale),
    cumulatedMark: program.cumulatedMark ?? null,
    finalMark: program.finalMark ?? null,
    scaleUsed: program.scaleUsed ?? null,
    rubric: YEAR_CRITERIA.map((criterion) => {
      const row = scoreById.get(criterion.id)
      return {
        criterionId: criterion.id,
        label: criterion.label,
        max: criterion.max,
        marks: row ? row.marks : null,
        comment: row?.comment ?? "",
      }
    }),
    rubricTotal: rubricTotal(program.rubricScores),
    comments: program.comments ?? "",
    exportStatus: program.examCellExport?.status ?? "PENDING",
    creditsPosted: ledger.reduce((sum, row) => sum + row.credits, 0),
    signoffs,
  }
}
