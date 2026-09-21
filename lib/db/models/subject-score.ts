import mongoose, { Schema, Types } from "mongoose"
import { RECORD_TYPES, type RecordType } from "@/lib/domain/record-types"

export type SubjectScoreDoc = {
  campusId: Types.ObjectId
  studentId: Types.ObjectId
  courseId: Types.ObjectId
  termId: Types.ObjectId
  recordType: RecordType
  rawAverage: number
  entryMax: number
  frameworkMarks: number
  normalized: number
  formulaId: "scale_average" | "classroom_composites"
  computedAt: Date
}

const subjectScoreSchema = new Schema<SubjectScoreDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    recordType: { type: String, enum: RECORD_TYPES, required: true },
    rawAverage: { type: Number, required: true },
    entryMax: { type: Number, required: true },
    frameworkMarks: { type: Number, required: true },
    normalized: { type: Number, required: true },
    formulaId: {
      type: String,
      enum: ["scale_average", "classroom_composites"],
      required: true,
    },
    computedAt: { type: Date, required: true },
  },
  { collection: "subject_scores" }
)

subjectScoreSchema.index(
  { studentId: 1, courseId: 1, recordType: 1 },
  { unique: true }
)
subjectScoreSchema.index({ courseId: 1, recordType: 1 })

export const SubjectScore =
  mongoose.models.SubjectScore ??
  mongoose.model<SubjectScoreDoc>("SubjectScore", subjectScoreSchema)
