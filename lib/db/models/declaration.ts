import mongoose, { Schema, Types } from "mongoose"

export type DeclarationDoc = {
  userId: Types.ObjectId
  acceptedAt: Date
  ip: string
  userAgent: string
  textVersion: string
}

const declarationSchema = new Schema<DeclarationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acceptedAt: { type: Date, required: true },
    ip: { type: String, required: true },
    userAgent: { type: String, required: true },
    textVersion: { type: String, required: true },
  },
  { collection: "declarations" }
)

declarationSchema.index({ userId: 1, acceptedAt: -1 })

export const Declaration =
  mongoose.models.Declaration ??
  mongoose.model<DeclarationDoc>("Declaration", declarationSchema)
