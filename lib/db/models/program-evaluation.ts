import mongoose, { Schema, Types } from "mongoose"
import {
  EXPORT_STATUSES,
  YEAR_EVAL_STATUSES,
  type ExportStatus,
  type YearEvalStatus,
} from "@/lib/domain/tiers"
import type { RubricScore } from "@/lib/db/models/year-evaluation"

const rubricScoreSchema = new Schema<RubricScore>(
  {
    criterionId: { type: String, required: true },
    marks: { type: Number, required: true },
    comment: { type: String, default: "" },
  },
  { _id: false }
)

export type ProgramEvaluationDoc = {
  studentId: Types.ObjectId
  campusId: Types.ObjectId
  departmentId?: Types.ObjectId
  programmeId: Types.ObjectId
  yearEvaluationIds: Types.ObjectId[]
  committeeIds: Types.ObjectId[]
  rubricScores: RubricScore[]
  comments: string
  cumulatedMark?: number
  finalMark?: number
  scaleUsed?: number
  examCellExport: {
    at?: Date
    payloadRef?: string
    status: ExportStatus
  }
  status: YearEvalStatus
  createdAt: Date
  updatedAt: Date
}

const programEvaluationSchema = new Schema<ProgramEvaluationDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    programmeId: { type: Schema.Types.ObjectId, ref: "Programme", required: true },
    yearEvaluationIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "YearEvaluation" }],
      default: [],
    },
    committeeIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    rubricScores: { type: [rubricScoreSchema], default: [] },
    comments: { type: String, default: "" },
    cumulatedMark: { type: Number },
    finalMark: { type: Number },
    scaleUsed: { type: Number },
    examCellExport: {
      at: { type: Date },
      payloadRef: { type: String },
      status: { type: String, enum: EXPORT_STATUSES, default: "PENDING" },
    },
    status: { type: String, enum: YEAR_EVAL_STATUSES, required: true },
  },
  { collection: "program_evaluations", timestamps: true }
)

programEvaluationSchema.index({ studentId: 1 }, { unique: true })
programEvaluationSchema.index({ campusId: 1, status: 1 })
programEvaluationSchema.index({ committeeIds: 1, status: 1 })

export const ProgramEvaluation =
  mongoose.models.ProgramEvaluation ??
  mongoose.model<ProgramEvaluationDoc>("ProgramEvaluation", programEvaluationSchema)
