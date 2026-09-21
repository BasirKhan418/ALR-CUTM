import type { CatalogCourse } from "@/lib/catalog/queries"
import { ClassroomComponents } from "@/lib/db/models/classroom-components"
import { Course } from "@/lib/db/models/course"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { SubjectScore } from "@/lib/db/models/subject-score"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import {
  ACTION_CRITERIA,
  ACTION_ENTRY_MAX,
  APPLIED_CRITERIA,
  APPLIED_ENTRY_MAX,
  CLASSROOM_ENTRY_MAX,
  actionTotal,
  appliedTotal,
  classroomTotal,
  type ActionScores,
  type AppliedScores,
} from "@/lib/domain/scoring"
import { toLrEntryView } from "@/lib/lr/serialize"
import type {
  FacultyInboxItem,
  InboxCriterionMark,
  LrEntryView,
  WorkshopCertificateData,
} from "@/lib/lr/types"
import type { RecordType } from "@/lib/domain/record-types"

export async function listMyEntries(
  studentId: string,
  courseId?: string,
  recordType?: RecordType
): Promise<LrEntryView[]> {
  await connectMongo()
  const filter: Record<string, unknown> = { studentId }
  if (courseId) filter.courseId = courseId
  if (recordType) filter.recordType = recordType
  const entries = await LrEntry.find(filter).sort({ createdAt: 1 }).lean()
  return entries.map(toLrEntryView)
}

export async function loadStudentCourseEntries(
  studentId: string,
  courseId: string
): Promise<LrEntryView[]> {
  return listMyEntries(studentId, courseId)
}

export async function loadWorkshopCertificateData(
  studentId: string,
  course: CatalogCourse,
  studentName: string,
  studentEmail: string
): Promise<WorkshopCertificateData> {
  const entries = await listMyEntries(studentId, course.id, "ACTION_LEARNING")
  const tasks = entries
    .filter((entry) => Number(entry.hoursContributed) > 0)
    .map((entry) => ({
      title: entry.taskTitle || "Untitled task",
      hours: Number(entry.hoursContributed),
      status: entry.status,
    }))
  return {
    studentName,
    studentEmail,
    courseCode: course.code,
    courseTitle: course.title,
    termName: course.termName,
    academicYear: course.academicYear,
    totalHours: tasks.reduce((sum, task) => sum + task.hours, 0),
    tasks,
  }
}

export async function loadFacultyInbox(
  facultyUserId: string,
  courseId?: string
): Promise<FacultyInboxItem[]> {
  await connectMongo()
  const assignments = await FacultyAssignment.find({
    userId: facultyUserId,
    role: "FACULTY",
  }).lean()
  const assignedIds = assignments.map((item) => String(item.courseId))
  const scopedIds = courseId
    ? assignedIds.filter((id) => id === courseId)
    : assignedIds
  if (scopedIds.length === 0) return []

  const entries = await LrEntry.find({
    courseId: { $in: scopedIds },
    status: "SUBMITTED",
  })
    .sort({ submittedAt: -1, createdAt: -1 })
    .lean()

  const studentIds = entries.map((entry) => entry.studentId)
  const [students, courses, terms, subjectScores, classroomRows] =
    await Promise.all([
      User.find({ _id: { $in: studentIds } }).lean(),
      Course.find({ _id: { $in: scopedIds } }).lean(),
      Term.find({
        _id: { $in: entries.map((entry) => entry.termId) },
      }).lean(),
      SubjectScore.find({
        courseId: { $in: scopedIds },
        studentId: { $in: studentIds },
      }).lean(),
      ClassroomComponents.find({
        courseId: { $in: scopedIds },
        studentId: { $in: studentIds },
      }).lean(),
    ])
  const studentById = new Map(
    students.map((person) => [String(person._id), person])
  )
  const courseById = new Map(
    courses.map((course) => [String(course._id), course])
  )
  const termById = new Map(terms.map((term) => [String(term._id), term]))
  const subjectByKey = new Map(
    subjectScores.map((row) => [
      `${row.studentId}:${row.courseId}:${row.recordType}`,
      row,
    ])
  )
  const classroomByKey = new Map(
    classroomRows.map((row) => [`${row.studentId}:${row.courseId}`, row])
  )

  return entries.map((entry) => {
    const student = studentById.get(String(entry.studentId))
    const course = courseById.get(String(entry.courseId))
    const term = termById.get(String(entry.termId))
    const facultyScores = entry.facultyScores ?? {}
    const classroomConfig = course?.recordConfigs.find(
      (config: { recordType: string }) => config.recordType === "CLASSROOM_LEARNING"
    )
    const marks = inboxMarks(
      entry.recordType,
      facultyScores,
      classroomByKey.get(`${entry.studentId}:${entry.courseId}`),
      classroomConfig?.compositeWeights
    )
    const subject = subjectByKey.get(
      `${entry.studentId}:${entry.courseId}:${entry.recordType}`
    )
    return {
      ...toLrEntryView(entry),
      studentName: student?.name ?? "Student",
      studentEmail: student?.email ?? "",
      courseCode: course?.code ?? "Course",
      courseTitle: course?.title ?? "",
      termName: term?.name ?? "",
      scored:
        entry.recordType === "CLASSROOM_LEARNING"
          ? Boolean(marks.entryTotal !== null)
          : Boolean(entry.scoredAt),
      scoredAt: entry.scoredAt ? entry.scoredAt.toISOString() : null,
      facultyScores,
      facultyRemarks: entry.facultyRemarks ?? "",
      entryTotal: marks.entryTotal,
      entryMax: marks.entryMax,
      criterionMarks: marks.criterionMarks,
      subjectNormalized: subject?.normalized ?? null,
      subjectFramework: subject?.frameworkMarks ?? null,
    }
  })
}

function inboxMarks(
  recordType: RecordType,
  facultyScores: Record<string, number>,
  classroom?: {
    assignment: number
    presentation: number
    midSem: number
    recordMark: number
  },
  classroomMax?: {
    assignment: number
    presentation: number
    midsem: number
    record: number
  }
): {
  entryTotal: number | null
  entryMax: number | null
  criterionMarks: InboxCriterionMark[]
} {
  if (recordType === "APPLIED_ACTION_LEARNING") {
    const complete = APPLIED_CRITERIA.every((item) =>
      Number.isFinite(facultyScores[item.key])
    )
    return {
      entryTotal: complete ? appliedTotal(facultyScores as AppliedScores) : null,
      entryMax: APPLIED_ENTRY_MAX,
      criterionMarks: APPLIED_CRITERIA.map((item) => ({
        key: item.key,
        label: item.label,
        value: Number(facultyScores[item.key]),
        max: item.max,
      })),
    }
  }
  if (recordType === "ACTION_LEARNING") {
    const complete = ACTION_CRITERIA.every((item) =>
      Number.isFinite(facultyScores[item.key])
    )
    return {
      entryTotal: complete ? actionTotal(facultyScores as ActionScores) : null,
      entryMax: ACTION_ENTRY_MAX,
      criterionMarks: ACTION_CRITERIA.map((item) => ({
        key: item.key,
        label: item.label,
        value: Number(facultyScores[item.key]),
        max: item.max,
      })),
    }
  }
  if (recordType === "CLASSROOM_LEARNING" && classroom) {
    return {
      entryTotal: classroomTotal(classroom),
      entryMax: CLASSROOM_ENTRY_MAX,
      criterionMarks: [
        {
          key: "assignment",
          label: "Assignment",
          value: classroom.assignment,
          max: classroomMax?.assignment ?? 2.5,
        },
        {
          key: "presentation",
          label: "Presentation",
          value: classroom.presentation,
          max: classroomMax?.presentation ?? 2.5,
        },
        {
          key: "midSem",
          label: "Mid-sem",
          value: classroom.midSem,
          max: classroomMax?.midsem ?? 2.5,
        },
        {
          key: "recordMark",
          label: "Record",
          value: classroom.recordMark,
          max: classroomMax?.record ?? 2.5,
        },
      ],
    }
  }
  return { entryTotal: null, entryMax: null, criterionMarks: [] }
}

