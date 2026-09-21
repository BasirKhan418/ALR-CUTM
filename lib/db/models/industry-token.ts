import mongoose, { Schema, Types } from "mongoose"

export type IndustryTokenDoc = {
  campusId: Types.ObjectId
  deliverableId: Types.ObjectId
  tokenHash: string
  issuedBy: Types.ObjectId
  expiresAt: Date
  usedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const industryTokenSchema = new Schema<IndustryTokenDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    deliverableId: {
      type: Schema.Types.ObjectId,
      ref: "MajorDeliverable",
      required: true,
    },
    tokenHash: { type: String, required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { collection: "industry_tokens", timestamps: true }
)

industryTokenSchema.index({ tokenHash: 1 }, { unique: true })
industryTokenSchema.index({ deliverableId: 1, createdAt: -1 })

export const IndustryToken =
  mongoose.models.IndustryToken ??
  mongoose.model<IndustryTokenDoc>("IndustryToken", industryTokenSchema)
