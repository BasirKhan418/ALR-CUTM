import mongoose, { Schema, Types } from "mongoose"

export type ProgrammingUploadDoc = {
  campusId: Types.ObjectId
  studentId: Types.ObjectId
  courseId: Types.ObjectId
  termId: Types.ObjectId
  zipFileId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const programmingUploadSchema = new Schema<ProgrammingUploadDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    zipFileId: { type: Schema.Types.ObjectId, ref: "StoredFile", required: true },
  },
  { collection: "programming_uploads", timestamps: true }
)

programmingUploadSchema.index({ studentId: 1, courseId: 1 }, { unique: true })

export const ProgrammingUpload =
  mongoose.models.ProgrammingUpload ??
  mongoose.model<ProgrammingUploadDoc>("ProgrammingUpload", programmingUploadSchema)
