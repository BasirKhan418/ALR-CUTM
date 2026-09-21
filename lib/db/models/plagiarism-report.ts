import mongoose, { Schema, Types } from "mongoose"
import {
  PLAGIARISM_REPORT_STATUSES,
  PLAGIARISM_TARGET_TYPES,
  PLAGIARISM_TOOLS,
  type PlagiarismDocumentType,
  type PlagiarismReportStatus,
  type PlagiarismTargetType,
  type PlagiarismTool,
} from "@/lib/domain/plagiarism"

export type PlagiarismMatchDoc = {
  id: string
  sourceLabel: string
  sourceTargetId?: string
  overlap: number
  excerpt?: string
}

export type PlagiarismExclusionDoc = {
  matchId: string
  reason: string
  certificateFileId?: Types.ObjectId
  bySupervisorId: Types.ObjectId
  at: Date
}

export type PlagiarismReportDoc = {
  campusId: Types.ObjectId
  targetType: PlagiarismTargetType
  targetId: Types.ObjectId
  deliverableId?: Types.ObjectId
  documentType: PlagiarismDocumentType
  tool: PlagiarismTool
  jobName: string
  score?: number
  rawScore?: number
  thresholdApplied: number
  status: PlagiarismReportStatus
  matches: PlagiarismMatchDoc[]
  exclusions: PlagiarismExclusionDoc[]
  termId?: Types.ObjectId
  courseId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const plagiarismReportSchema = new Schema<PlagiarismReportDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    targetType: { type: String, enum: PLAGIARISM_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    deliverableId: { type: Schema.Types.ObjectId, ref: "MajorDeliverable" },
    documentType: { type: String, required: true },
    tool: { type: String, enum: PLAGIARISM_TOOLS, required: true },
    jobName: { type: String, required: true },
    score: Number,
    rawScore: Number,
    thresholdApplied: { type: Number, required: true },
    status: {
      type: String,
      enum: PLAGIARISM_REPORT_STATUSES,
      required: true,
      default: "PENDING",
    },
    matches: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          sourceLabel: { type: String, required: true },
          sourceTargetId: String,
          overlap: { type: Number, required: true },
          excerpt: String,
        },
      ],
      default: [],
    },
    exclusions: {
      type: [
        {
          _id: false,
          matchId: { type: String, required: true },
          reason: { type: String, required: true },
          certificateFileId: { type: Schema.Types.ObjectId, ref: "StoredFile" },
          bySupervisorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
          at: { type: Date, required: true },
        },
      ],
      default: [],
    },
    termId: { type: Schema.Types.ObjectId, ref: "Term" },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
  },
  { collection: "plagiarism_reports", timestamps: true }
)

plagiarismReportSchema.index({ targetType: 1, targetId: 1 }, { unique: true })
plagiarismReportSchema.index({ campusId: 1, status: 1 })
plagiarismReportSchema.index({ deliverableId: 1 })

export const PlagiarismReport =
  mongoose.models.PlagiarismReport ??
  mongoose.model<PlagiarismReportDoc>("PlagiarismReport", plagiarismReportSchema)
