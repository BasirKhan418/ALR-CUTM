import mongoose, { Schema, Types } from "mongoose"
import { RECORD_TYPES, type RecordType } from "@/lib/domain/record-types"
import {
  LR_ENTRY_STATUSES,
  type LrEntryStatus,
} from "@/lib/domain/lr"

export type LrEntryDoc = {
  campusId: Types.ObjectId
  studentId: Types.ObjectId
  courseId: Types.ObjectId
  termId: Types.ObjectId
  recordType: RecordType
  status: LrEntryStatus
  submittedAt?: Date
  sessionDate?: Date
  topic?: string
  reflection?: string
  hours?: number
  experimentNo?: number
  title?: string
  concept?: string
  planning?: string
  result?: string
  recordNotes?: string
  vivaNotes?: string
  taskTitle?: string
  criticalThinking?: string
  hoursContributed?: number
  booksManuals?: string
  createdAt: Date
  updatedAt: Date
}

const lrEntrySchema = new Schema<LrEntryDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    recordType: { type: String, enum: RECORD_TYPES, required: true },
    status: { type: String, enum: LR_ENTRY_STATUSES, required: true },
    submittedAt: { type: Date },
    sessionDate: { type: Date },
    topic: { type: String, trim: true },
    reflection: { type: String, trim: true },
    hours: { type: Number },
    experimentNo: { type: Number },
    title: { type: String, trim: true },
    concept: { type: String, trim: true },
    planning: { type: String, trim: true },
    result: { type: String, trim: true },
    recordNotes: { type: String, trim: true },
    vivaNotes: { type: String, trim: true },
    taskTitle: { type: String, trim: true },
    criticalThinking: { type: String, trim: true },
    hoursContributed: { type: Number },
    booksManuals: { type: String, trim: true },
  },
  { collection: "lr_entries", timestamps: true }
)

lrEntrySchema.index({ courseId: 1, studentId: 1, recordType: 1, createdAt: 1 })
lrEntrySchema.index({ studentId: 1, courseId: 1, createdAt: 1 })
lrEntrySchema.index({ courseId: 1, status: 1, submittedAt: -1 })

export const LrEntry =
  mongoose.models.LrEntry ??
  mongoose.model<LrEntryDoc>("LrEntry", lrEntrySchema)
