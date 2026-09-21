import { Campus } from "@/lib/db/models/campus"
import { Course } from "@/lib/db/models/course"
import { Department } from "@/lib/db/models/department"
import { Enrollment } from "@/lib/db/models/enrollment"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { Programme } from "@/lib/db/models/programme"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import type { ManageCourse } from "@/lib/catalog/types"

export async function loadCourseManage(courseId: string) {
  await connectMongo()
  const course = await Course.findById(courseId).lean()
  if (!course) return null

  const [term, department, programme, assignments, enrollments] =
    await Promise.all([
      Term.findById(course.termId).lean(),
      Department.findById(course.departmentId).lean(),
      Programme.findById(course.programmeId).lean(),
      FacultyAssignment.find({ courseId: course._id }).lean(),
      Enrollment.find({ courseId: course._id }).lean(),
    ])

  const staffIds = assignments.map((item) => item.userId)
  const studentIds = enrollments.map((item) => item.studentId)
  const people = await User.find({
    $or: [
      { campusId: course.campusId, roles: { $in: ["FACULTY", "MENTOR", "STUDENT"] } },
      ...(staffIds.length || studentIds.length
        ? [{ _id: { $in: [...staffIds, ...studentIds] } }]
        : []),
    ],
  })
    .sort({ name: 1 })
    .lean()

  const personById = new Map(people.map((person) => [String(person._id), person]))

  const manage: ManageCourse = {
    id: String(course._id),
    code: course.code,
    title: course.title,
    termName: term?.name ?? "Term",
    academicYear: term?.academicYear ?? "",
    departmentName: department?.name ?? "Department",
    programmeName: programme?.name ?? "Programme",
    combinationCode: course.combinationCode,
    deliveryMode: course.deliveryMode,
    recordConfigs: course.recordConfigs,
  }

  return {
    course: manage,
    campusId: String(course.campusId),
    departmentId: String(course.departmentId),
    staff: assignments.map((item) => {
      const person = personById.get(String(item.userId))
      return {
        id: String(item._id),
        userId: String(item.userId),
        name: person?.name ?? "Unknown",
        email: person?.email ?? "",
        role: item.role,
      }
    }),
    enrolled: enrollments.map((item) => {
      const person = personById.get(String(item.studentId))
      return {
        id: String(item.studentId),
        name: person?.name ?? "Unknown",
        email: person?.email ?? "",
      }
    }),
    facultyOptions: people
      .filter((person) => person.roles.includes("FACULTY") && person.active)
      .map((person) => ({ id: String(person._id), name: person.name })),
    mentorOptions: people
      .filter((person) => person.roles.includes("MENTOR") && person.active)
      .map((person) => ({ id: String(person._id), name: person.name })),
    studentOptions: people
      .filter((person) => person.roles.includes("STUDENT") && person.active)
      .map((person) => ({
        id: String(person._id),
        name: person.name,
        email: person.email,
      })),
  }
}

export async function loadSetupOptions() {
  await connectMongo()
  const [campuses, departments, programmes, terms] = await Promise.all([
    Campus.find({ active: true }).sort({ name: 1 }).lean(),
    Department.find().sort({ name: 1 }).lean(),
    Programme.find().sort({ name: 1 }).lean(),
    Term.find().sort({ startsAt: -1 }).lean(),
  ])
  return {
    campuses: campuses.map((item) => ({ id: String(item._id), name: item.name })),
    departments: departments.map((item) => ({
      id: String(item._id),
      campusId: String(item.campusId),
      name: item.name,
    })),
    programmes: programmes.map((item) => ({
      id: String(item._id),
      campusId: String(item.campusId),
      departmentId: String(item.departmentId),
      name: item.name,
    })),
    terms: terms.map((item) => ({
      id: String(item._id),
      name: item.name,
      academicYear: item.academicYear,
    })),
  }
}
