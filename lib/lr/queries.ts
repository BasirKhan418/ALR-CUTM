import type { CatalogCourse } from "@/lib/catalog/queries"
import { Course } from "@/lib/db/models/course"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import { toLrEntryView } from "@/lib/lr/serialize"
import type {
  FacultyInboxItem,
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

  const [students, courses, terms] = await Promise.all([
    User.find({ _id: { $in: entries.map((entry) => entry.studentId) } }).lean(),
    Course.find({ _id: { $in: scopedIds } }).lean(),
    Term.find({
      _id: { $in: entries.map((entry) => entry.termId) },
    }).lean(),
  ])
  const studentById = new Map(
    students.map((person) => [String(person._id), person])
  )
  const courseById = new Map(
    courses.map((course) => [String(course._id), course])
  )
  const termById = new Map(terms.map((term) => [String(term._id), term]))

  return entries.map((entry) => {
    const student = studentById.get(String(entry.studentId))
    const course = courseById.get(String(entry.courseId))
    const term = termById.get(String(entry.termId))
    return {
      ...toLrEntryView(entry),
      studentName: student?.name ?? "Student",
      studentEmail: student?.email ?? "",
      courseCode: course?.code ?? "Course",
      courseTitle: course?.title ?? "",
      termName: term?.name ?? "",
    }
  })
}

