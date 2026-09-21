import mongoose, { Schema, Types } from "mongoose"
import {
  PLAGIARISM_CASE_STATUSES,
  PLAGIARISM_TARGET_TYPES,
  type PlagiarismCaseStatus,
  type PlagiarismTargetType,
} from "@/lib/domain/plagiarism"
import type { DeliverableStatus } from "@/lib/domain/deliverable"

export type PlagiarismCaseDoc = {
  campusId: Types.ObjectId
  reportId: Types.ObjectId
  targetType: PlagiarismTargetType
  targetId: Types.ObjectId
  deliverableId?: Types.ObjectId
  courseId?: Types.ObjectId
  studentIds: Types.ObjectId[]
  committeeMemberIds: Types.ObjectId[]
  assignedBy?: Types.ObjectId
  responseDueAt: Date
  responseExpired: boolean
  studentResponse?: { by: Types.ObjectId; text: string; at: Date }
  recommendation?: { by: Types.ObjectId; text: string; at: Date }
  status: PlagiarismCaseStatus
  statusBeforeCase?: DeliverableStatus
  createdAt: Date
  updatedAt: Date
}

const plagiarismCaseSchema = new Schema<PlagiarismCaseDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    reportId: {
      type: Schema.Types.ObjectId,
      ref: "PlagiarismReport",
      required: true,
    },
    targetType: { type: String, enum: PLAGIARISM_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    deliverableId: { type: Schema.Types.ObjectId, ref: "MajorDeliverable" },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    studentIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: true,
    },
    committeeMemberIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    responseDueAt: { type: Date, required: true },
    responseExpired: { type: Boolean, default: false },
    studentResponse: {
      by: { type: Schema.Types.ObjectId, ref: "User" },
      text: String,
      at: Date,
    },
    recommendation: {
      by: { type: Schema.Types.ObjectId, ref: "User" },
      text: String,
      at: Date,
    },
    status: {
      type: String,
      enum: PLAGIARISM_CASE_STATUSES,
      required: true,
      default: "OPEN",
    },
    statusBeforeCase: String,
  },
  { collection: "plagiarism_cases", timestamps: true }
)

plagiarismCaseSchema.index({ reportId: 1 })
plagiarismCaseSchema.index({ studentIds: 1, status: 1 })
plagiarismCaseSchema.index({ responseDueAt: 1, status: 1 })
plagiarismCaseSchema.index({ campusId: 1, status: 1 })

export const PlagiarismCase =
  mongoose.models.PlagiarismCase ??
  mongoose.model<PlagiarismCaseDoc>("PlagiarismCase", plagiarismCaseSchema)
