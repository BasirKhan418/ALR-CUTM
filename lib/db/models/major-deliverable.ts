import mongoose, { Schema, Types } from "mongoose"
import {
  DELIVERABLE_STATUSES,
  DELIVERABLE_TYPES,
  type DeliverableStatus,
  type DeliverableType,
} from "@/lib/domain/deliverable"

export type IndustrySupervisor = {
  name: string
  email: string
  org: string
}

export type InternScores = {
  internal?: number
  external?: number
  total?: number
}

export type IndustryFeedback = {
  attendance: string
  stipend: string
  taskCompletion: string
  feedback: string
}

export type CoAttainmentRow = {
  code: string
  statement: string
  level: string
  remarks: string
}

export type CandidateSnapshot = {
  userId: Types.ObjectId
  name: string
  email: string
  registrationNo: string
}

export type MajorDeliverableDoc = {
  campusId: Types.ObjectId
  departmentId: Types.ObjectId
  programmeId: Types.ObjectId
  courseId: Types.ObjectId
  termId: Types.ObjectId
  type: DeliverableType
  title: string
  branch?: string
  specialization?: string
  candidateIds: Types.ObjectId[]
  candidates: CandidateSnapshot[]
  supervisorId?: Types.ObjectId
  coSupervisorId?: Types.ObjectId
  industrySupervisor?: IndustrySupervisor
  wordFileId?: Types.ObjectId
  pdfFileId?: Types.ObjectId
  status: DeliverableStatus
  internScores?: InternScores
  industryFeedback?: IndustryFeedback
  coAttainment: CoAttainmentRow[]
  rubricScores?: { total: number; remarks?: string }
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const majorDeliverableSchema = new Schema<MajorDeliverableDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    programmeId: { type: Schema.Types.ObjectId, ref: "Programme", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    type: { type: String, enum: DELIVERABLE_TYPES, required: true },
    title: { type: String, trim: true, default: "" },
    branch: { type: String, trim: true },
    specialization: { type: String, trim: true },
    candidateIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: true,
    },
    candidates: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
        registrationNo: { type: String, default: "" },
      },
    ],
    supervisorId: { type: Schema.Types.ObjectId, ref: "User" },
    coSupervisorId: { type: Schema.Types.ObjectId, ref: "User" },
    industrySupervisor: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      org: { type: String, trim: true },
    },
    wordFileId: { type: Schema.Types.ObjectId, ref: "StoredFile" },
    pdfFileId: { type: Schema.Types.ObjectId, ref: "StoredFile" },
    status: {
      type: String,
      enum: DELIVERABLE_STATUSES,
      required: true,
      default: "DRAFT",
    },
    internScores: {
      internal: Number,
      external: Number,
      total: Number,
    },
    industryFeedback: {
      attendance: String,
      stipend: String,
      taskCompletion: String,
      feedback: String,
    },
    coAttainment: {
      type: [
        {
          code: { type: String, default: "" },
          statement: { type: String, default: "" },
          level: { type: String, default: "" },
          remarks: { type: String, default: "" },
        },
      ],
      default: [],
    },
    rubricScores: {
      total: Number,
      remarks: String,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { collection: "major_deliverables", timestamps: true }
)

majorDeliverableSchema.index({ candidateIds: 1, courseId: 1, type: 1 })
majorDeliverableSchema.index({ supervisorId: 1, status: 1 })
majorDeliverableSchema.index({ courseId: 1, status: 1 })
majorDeliverableSchema.index({ campusId: 1, departmentId: 1 })

export const MajorDeliverable =
  mongoose.models.MajorDeliverable ??
  mongoose.model<MajorDeliverableDoc>("MajorDeliverable", majorDeliverableSchema)
