import mongoose, { Schema, Types } from "mongoose"

export const PUBLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "RETURNED",
  "REJECTED",
  "APPROVED",
] as const

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number]

export type PaperPublicationDoc = {
  campusId: Types.ObjectId
  deliverableId: Types.ObjectId
  title: string
  venue: string
  proofFileId?: Types.ObjectId
  status: PublicationStatus
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const paperPublicationSchema = new Schema<PaperPublicationDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    deliverableId: {
      type: Schema.Types.ObjectId,
      ref: "MajorDeliverable",
      required: true,
    },
    title: { type: String, trim: true, default: "" },
    venue: { type: String, trim: true, default: "" },
    proofFileId: { type: Schema.Types.ObjectId, ref: "StoredFile" },
    status: {
      type: String,
      enum: PUBLICATION_STATUSES,
      required: true,
      default: "DRAFT",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { collection: "paper_publications", timestamps: true }
)

paperPublicationSchema.index({ deliverableId: 1 }, { unique: true })

export const PaperPublication =
  mongoose.models.PaperPublication ??
  mongoose.model<PaperPublicationDoc>("PaperPublication", paperPublicationSchema)
