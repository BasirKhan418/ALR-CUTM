import mongoose, { Schema, Types } from "mongoose"
import type { Role } from "@/lib/domain/roles"
import {
  SIGNOFF_DECISIONS,
  SIGNOFF_TARGET_TYPES,
  type SignoffDecision,
  type SignoffTargetType,
} from "@/lib/domain/signoff"

export type SignoffDoc = {
  campusId: Types.ObjectId
  targetType: SignoffTargetType
  targetId: Types.ObjectId
  stepOrder: number
  role: Role
  actorId?: Types.ObjectId
  decision: SignoffDecision
  reason?: string
  at?: Date
  createdAt: Date
  updatedAt: Date
}

const signoffSchema = new Schema<SignoffDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    targetType: { type: String, enum: SIGNOFF_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    stepOrder: { type: Number, required: true },
    role: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    decision: { type: String, enum: SIGNOFF_DECISIONS, required: true },
    reason: { type: String, trim: true },
    at: { type: Date },
  },
  { collection: "signoffs", timestamps: true }
)

signoffSchema.index({ targetType: 1, targetId: 1, stepOrder: 1 })
signoffSchema.index({ role: 1, decision: 1 })

export const Signoff =
  mongoose.models.Signoff ?? mongoose.model<SignoffDoc>("Signoff", signoffSchema)
