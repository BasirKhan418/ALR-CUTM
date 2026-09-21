import mongoose, { Schema, Types } from "mongoose"

export const CLASSROOM_SOURCES = ["MANUAL"] as const
export type ClassroomSource = (typeof CLASSROOM_SOURCES)[number]

export type ClassroomComponentsDoc = {
  campusId: Types.ObjectId
  studentId: Types.ObjectId
  courseId: Types.ObjectId
  termId: Types.ObjectId
  assignment: number
  presentation: number
  midSem: number
  recordMark: number
  source: ClassroomSource
  updatedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const classroomComponentsSchema = new Schema<ClassroomComponentsDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    assignment: { type: Number, required: true },
    presentation: { type: Number, required: true },
    midSem: { type: Number, required: true },
    recordMark: { type: Number, required: true },
    source: { type: String, enum: CLASSROOM_SOURCES, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { collection: "classroom_components", timestamps: true }
)

classroomComponentsSchema.index(
  { studentId: 1, courseId: 1, termId: 1 },
  { unique: true }
)
classroomComponentsSchema.index({ courseId: 1 })

export const ClassroomComponents =
  mongoose.models.ClassroomComponents ??
  mongoose.model<ClassroomComponentsDoc>(
    "ClassroomComponents",
    classroomComponentsSchema
  )
