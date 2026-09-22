import { Enrollment } from "@/lib/db/models/enrollment"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { User } from "@/lib/db/models/user"
import type { AppSession } from "@/lib/auth/guards"
import { hasRole } from "@/lib/auth/guards"

export async function canReadStudentRecord(
  session: AppSession,
  studentId: string
): Promise<boolean> {
  if (session.userId === studentId) return true
  if (hasRole(session, "ADMIN")) return true
  const student = await User.findById(studentId).select("campusId departmentId active").lean()
  if (!student || !student.active) return false
  if (hasRole(session, "DEAN") && session.campusId === String(student.campusId)) {
    return true
  }
  if (
    hasRole(session, "HOD") &&
    session.campusId === String(student.campusId) &&
    session.departmentId &&
    session.departmentId === String(student.departmentId ?? "")
  ) {
    return true
  }
  if (!hasRole(session, "FACULTY")) return false
  const assignments = await FacultyAssignment.find({
    userId: session.userId,
    role: "FACULTY",
  })
    .select("courseId")
    .lean()
  if (assignments.length === 0) return false
  const enrolled = await Enrollment.exists({
    studentId,
    courseId: { $in: assignments.map((row) => row.courseId) },
  })
  return Boolean(enrolled)
}
