import mongoose, { Schema, Types } from "mongoose"

export type EnrollmentDoc = {
  studentId: Types.ObjectId
  courseId: Types.ObjectId
  termId: Types.ObjectId
}

const enrollmentSchema = new Schema<EnrollmentDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
  },
  { collection: "enrollments" }
)

enrollmentSchema.index({ studentId: 1, courseId: 1, termId: 1 }, { unique: true })
enrollmentSchema.index({ courseId: 1 })
enrollmentSchema.index({ studentId: 1, termId: 1 })

export const Enrollment =
  mongoose.models.Enrollment ??
  mongoose.model<EnrollmentDoc>("Enrollment", enrollmentSchema)
