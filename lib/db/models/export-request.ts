import mongoose, { Schema, Types } from "mongoose"

export const EXPORT_KINDS = ["BOOKLET", "WORKSHOP"] as const
export type ExportKind = (typeof EXPORT_KINDS)[number]

export const EXPORT_SCOPES = ["YEAR", "PROGRAM"] as const
export type ExportScope = (typeof EXPORT_SCOPES)[number]

export const EXPORT_STATUSES = ["QUEUED", "READY", "FAILED"] as const
export type ExportStatus = (typeof EXPORT_STATUSES)[number]

export type ExportRequestDoc = {
  campusId: Types.ObjectId
  studentId: Types.ObjectId
  requestedBy: Types.ObjectId
  kind: ExportKind
  scope?: ExportScope
  academicYear?: string
  courseId?: Types.ObjectId
  status: ExportStatus
  fileId?: Types.ObjectId
  error?: string
  createdAt: Date
  updatedAt: Date
}

const exportRequestSchema = new Schema<ExportRequestDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: EXPORT_KINDS, required: true },
    scope: { type: String, enum: EXPORT_SCOPES },
    academicYear: { type: String, trim: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    status: { type: String, enum: EXPORT_STATUSES, required: true },
    fileId: { type: Schema.Types.ObjectId, ref: "StoredFile" },
    error: { type: String, trim: true },
  },
  { collection: "export_requests", timestamps: true }
)

exportRequestSchema.index({ studentId: 1, createdAt: -1 })
exportRequestSchema.index({ requestedBy: 1, createdAt: -1 })
exportRequestSchema.index({ kind: 1, status: 1 })

export const ExportRequest =
  mongoose.models.ExportRequest ??
  mongoose.model<ExportRequestDoc>("ExportRequest", exportRequestSchema)
