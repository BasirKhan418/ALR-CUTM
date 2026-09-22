import mongoose, { Schema, Types } from "mongoose"
import {
  EXPORT_STATUSES,
  YEAR_EVAL_STATUSES,
  type ExportStatus,
  type YearEvalStatus,
} from "@/lib/domain/tiers"

export type CompiledComponent = {
  kind: "LR" | "DELIVERABLE"
  id: Types.ObjectId
}

export type RubricScore = {
  criterionId: string
  marks: number
  comment: string
}

export type MentorPoPso = {
  signedBy?: Types.ObjectId
  at?: Date
  sheet?: string
}

export type FacultyCoRef = {
  courseId: Types.ObjectId
  signedBy: Types.ObjectId
  at: Date
  sheet?: string
}

export type ExamCellExportState = {
  at?: Date
  payloadRef?: string
  status: ExportStatus
}

export type YearEvaluationDoc = {
  studentId: Types.ObjectId
  academicYear: string
  campusId: Types.ObjectId
  departmentId?: Types.ObjectId
  programmeId: Types.ObjectId
  compiledComponentIds: CompiledComponent[]
  committeeIds: Types.ObjectId[]
  rubricScores: RubricScore[]
  comments: string
  mentorPoPso?: MentorPoPso
  facultyCoRefs: FacultyCoRef[]
  creditPosted: boolean
  examCellExport: ExamCellExportState
  status: YearEvalStatus
  createdAt: Date
  updatedAt: Date
}

const compiledComponentSchema = new Schema<CompiledComponent>(
  {
    kind: { type: String, enum: ["LR", "DELIVERABLE"], required: true },
    id: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false }
)

const rubricScoreSchema = new Schema<RubricScore>(
  {
    criterionId: { type: String, required: true },
    marks: { type: Number, required: true },
    comment: { type: String, default: "" },
  },
  { _id: false }
)

const facultyCoRefSchema = new Schema<FacultyCoRef>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    signedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, required: true },
    sheet: { type: String, default: "" },
  },
  { _id: false }
)
const yearEvaluationSchema = new Schema<YearEvaluationDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    academicYear: { type: String, required: true, trim: true },
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    programmeId: { type: Schema.Types.ObjectId, ref: "Programme", required: true },
    compiledComponentIds: { type: [compiledComponentSchema], default: [] },
    committeeIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    rubricScores: { type: [rubricScoreSchema], default: [] },
    comments: { type: String, default: "" },
    mentorPoPso: {
      signedBy: { type: Schema.Types.ObjectId, ref: "User" },
      at: { type: Date },
      sheet: { type: String },
    },
    facultyCoRefs: { type: [facultyCoRefSchema], default: [] },
    creditPosted: { type: Boolean, default: false },
    examCellExport: {
      at: { type: Date },
      payloadRef: { type: String },
      status: { type: String, enum: EXPORT_STATUSES, default: "PENDING" },
    },
    status: { type: String, enum: YEAR_EVAL_STATUSES, required: true },
  },
  { collection: "year_evaluations", timestamps: true }
)

yearEvaluationSchema.index({ studentId: 1, academicYear: 1 }, { unique: true })
yearEvaluationSchema.index({ campusId: 1, academicYear: 1, status: 1 })
yearEvaluationSchema.index({ committeeIds: 1, status: 1 })
yearEvaluationSchema.index({ departmentId: 1, academicYear: 1 })

export const YearEvaluation =
  mongoose.models.YearEvaluation ??
  mongoose.model<YearEvaluationDoc>("YearEvaluation", yearEvaluationSchema)
