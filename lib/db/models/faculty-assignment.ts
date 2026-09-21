import mongoose, { Schema, Types } from "mongoose"

export const ASSIGNMENT_ROLES = ["FACULTY", "MENTOR"] as const
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number]

export type FacultyAssignmentDoc = {
  courseId: Types.ObjectId
  userId: Types.ObjectId
  role: AssignmentRole
}

const assignmentSchema = new Schema<FacultyAssignmentDoc>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ASSIGNMENT_ROLES, required: true },
  },
  { collection: "faculty_assignments" }
)

assignmentSchema.index({ courseId: 1, userId: 1, role: 1 }, { unique: true })
assignmentSchema.index({ userId: 1, role: 1 })

export const FacultyAssignment =
  mongoose.models.FacultyAssignment ??
  mongoose.model<FacultyAssignmentDoc>("FacultyAssignment", assignmentSchema)
