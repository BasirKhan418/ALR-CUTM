import mongoose, { Schema, Types } from "mongoose"

export const PLAGIARISM_REPORT_STATUSES = ["PENDING", "READY", "FAILED"] as const
export type PlagiarismReportStatus = (typeof PLAGIARISM_REPORT_STATUSES)[number]

export type PlagiarismReportDoc = {
  campusId: Types.ObjectId
  deliverableId: Types.ObjectId
  tool: string
  score?: number
  thresholdPercent: number
  status: PlagiarismReportStatus
  createdAt: Date
  updatedAt: Date
}

const plagiarismReportSchema = new Schema<PlagiarismReportDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    deliverableId: {
      type: Schema.Types.ObjectId,
      ref: "MajorDeliverable",
      required: true,
    },
    tool: { type: String, required: true, default: "STUB" },
    score: { type: Number },
    thresholdPercent: { type: Number, required: true },
    status: {
      type: String,
      enum: PLAGIARISM_REPORT_STATUSES,
      required: true,
      default: "PENDING",
    },
  },
  { collection: "plagiarism_reports", timestamps: true }
)

plagiarismReportSchema.index({ deliverableId: 1 }, { unique: true })

export const PlagiarismReport =
  mongoose.models.PlagiarismReport ??
  mongoose.model<PlagiarismReportDoc>("PlagiarismReport", plagiarismReportSchema)
