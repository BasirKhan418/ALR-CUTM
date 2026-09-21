import mongoose, { Schema, Types } from "mongoose"

export const AI_SCORE_STATUSES = ["QUEUED", "DONE", "FAILED"] as const
export type AiScoreStatus = (typeof AI_SCORE_STATUSES)[number]

export type AiSuggestedScores = Record<string, number>

export type AiScoreOverride = {
  by: Types.ObjectId
  reason: string
  at: Date
  finalScores: AiSuggestedScores
}

export type AiScoreRunDoc = {
  entryId: Types.ObjectId
  campusId: Types.ObjectId
  courseId: Types.ObjectId
  studentId: Types.ObjectId
  provider: string
  rawOutput?: string
  suggestedScores?: AiSuggestedScores
  status: AiScoreStatus
  jobId?: string
  error?: string
  override?: AiScoreOverride
  createdAt: Date
  updatedAt: Date
}

const aiScoreRunSchema = new Schema<AiScoreRunDoc>(
  {
    entryId: { type: Schema.Types.ObjectId, ref: "LrEntry", required: true },
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: String, required: true },
    rawOutput: { type: String },
    suggestedScores: { type: Schema.Types.Mixed },
    status: { type: String, enum: AI_SCORE_STATUSES, required: true },
    jobId: { type: String },
    error: { type: String },
    override: {
      by: { type: Schema.Types.ObjectId, ref: "User" },
      reason: { type: String, trim: true },
      at: { type: Date },
      finalScores: { type: Schema.Types.Mixed },
    },
  },
  { collection: "ai_score_runs", timestamps: true }
)

aiScoreRunSchema.index({ entryId: 1, createdAt: -1 })
aiScoreRunSchema.index({ courseId: 1, studentId: 1 })

export const AiScoreRun =
  mongoose.models.AiScoreRun ??
  mongoose.model<AiScoreRunDoc>("AiScoreRun", aiScoreRunSchema)
