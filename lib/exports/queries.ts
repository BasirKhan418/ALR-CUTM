import { Campus } from "@/lib/db/models/campus"
import { Course } from "@/lib/db/models/course"
import { Department } from "@/lib/db/models/department"
import { Enrollment } from "@/lib/db/models/enrollment"
import { ExportRequest } from "@/lib/db/models/export-request"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { Programme } from "@/lib/db/models/programme"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"

export async function listAnalyticsChoices(campusId?: string) {
  await connectMongo()
  const departmentFilter = campusId ? { campusId } : {}
  const [campuses, departments, terms, programmes] = await Promise.all([
    Campus.find({ active: true }).sort({ name: 1 }).select("name").lean(),
    Department.find(departmentFilter).sort({ name: 1 }).select("name campusId").lean(),
    Term.find().sort({ academicYear: -1, name: 1 }).select("name academicYear").lean(),
    Programme.find().sort({ name: 1 }).select("name").lean(),
  ])
  return {
    campuses: campuses.map((row) => ({ id: String(row._id), name: row.name })),
    departments: departments.map((row) => ({
      id: String(row._id),
      name: row.name,
      campusId: String(row.campusId),
    })),
    terms: terms.map((row) => ({
      id: String(row._id),
      name: `${row.academicYear} · ${row.name}`,
    })),
    programmes: programmes.map((row) => ({ id: String(row._id), name: row.name })),
  }
}

export async function listStudentExportChoices(studentId: string) {
  await connectMongo()
  const enrollments = await Enrollment.find({ studentId }).select("courseId").lean()
  const courses = await Course.find({
    _id: { $in: enrollments.map((row) => row.courseId) },
  })
    .select("code title termId")
    .lean()
  const terms = await Term.find({
    _id: { $in: courses.map((course) => course.termId) },
  })
    .select("academicYear name")
    .lean()
  const years = [...new Set(terms.map((term) => term.academicYear))].sort()
  return {
    years,
    courses: courses.map((course) => ({
      id: String(course._id),
      name: `${course.code} · ${course.title}`,
    })),
  }
}

export async function listScopedStudents(input: {
  userId: string
  campusId: string
  departmentId?: string | null
  audience: "FACULTY" | "HOD"
}) {
  await connectMongo()
  if (input.audience === "HOD") {
    if (!input.departmentId) return []
    const students = await User.find({
      roles: "STUDENT",
      active: true,
      campusId: input.campusId,
      departmentId: input.departmentId,
    })
      .sort({ name: 1 })
      .select("name registrationNo")
      .lean()
    return students.map((student) => ({
      id: String(student._id),
      name: student.registrationNo
        ? `${student.name} · ${student.registrationNo}`
        : student.name,
    }))
  }

  const assignments = await FacultyAssignment.find({
    userId: input.userId,
    role: "FACULTY",
  })
    .select("courseId")
    .lean()
  if (assignments.length === 0) return []
  const enrollments = await Enrollment.find({
    courseId: { $in: assignments.map((row) => row.courseId) },
  })
    .select("studentId")
    .lean()
  const students = await User.find({
    _id: { $in: enrollments.map((row) => row.studentId) },
    active: true,
    campusId: input.campusId,
  })
    .sort({ name: 1 })
    .select("name registrationNo")
    .lean()
  return students.map((student) => ({
    id: String(student._id),
    name: student.registrationNo
      ? `${student.name} · ${student.registrationNo}`
      : student.name,
  }))
}

export type ExportRequestRow = {
  id: string
  kind: string
  scope?: string
  academicYear?: string
  status: string
  error?: string
  createdAt: string
  downloadHref?: string
}

export async function listExportRequests(input: {
  studentId?: string
  requestedBy?: string
}) {
  await connectMongo()
  const filter =
    input.studentId && input.requestedBy
      ? { $or: [{ studentId: input.studentId }, { requestedBy: input.requestedBy }] }
      : input.studentId
        ? { studentId: input.studentId }
        : { requestedBy: input.requestedBy }
  const rows = await ExportRequest.find(filter).sort({ createdAt: -1 }).limit(20).lean()
  return rows.map((row) => ({
    id: String(row._id),
    kind: row.kind,
    scope: row.scope,
    academicYear: row.academicYear,
    status: row.status,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    downloadHref:
      row.status === "READY" ? `/api/exports/booklet?request=${row._id}` : undefined,
  }))
}
