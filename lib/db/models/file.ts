import mongoose, { Schema, Types } from "mongoose"

export const FILE_KINDS = ["DOCX", "PDF", "PROOF"] as const
export type FileKind = (typeof FILE_KINDS)[number]

export type FileDoc = {
  campusId: Types.ObjectId
  uploadedBy: Types.ObjectId
  originalName: string
  mimeType: string
  byteSize: number
  storagePath: string
  kind: FileKind
  createdAt: Date
  updatedAt: Date
}

const fileSchema = new Schema<FileDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    byteSize: { type: Number, required: true },
    storagePath: { type: String, required: true },
    kind: { type: String, enum: FILE_KINDS, required: true },
  },
  { collection: "files", timestamps: true }
)

fileSchema.index({ campusId: 1, createdAt: -1 })

export const StoredFile =
  mongoose.models.StoredFile ??
  mongoose.model<FileDoc>("StoredFile", fileSchema)
