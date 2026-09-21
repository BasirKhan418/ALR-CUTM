import mongoose, { Schema, Types } from "mongoose"
import { ROLES, type Role } from "@/lib/domain/roles"

export const LOGIN_METHODS = ["OTP", "GOOGLE"] as const
export type LoginMethod = (typeof LOGIN_METHODS)[number]

export type UserDoc = {
  name: string
  email: string
  googleSub?: string
  registrationNo?: string
  campusId: Types.ObjectId
  departmentId?: Types.ObjectId
  programmeId?: Types.ObjectId
  roles: Role[]
  active: boolean
  lastLoginAt?: Date
  lastLoginMethod?: LoginMethod
  declarationAcceptedAt?: Date
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    googleSub: { type: String },
    registrationNo: { type: String },
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    programmeId: { type: Schema.Types.ObjectId, ref: "Programme" },
    roles: {
      type: [String],
      enum: ROLES,
      required: true,
      validate: {
        validator: (roles: string[]) => roles.length > 0,
        message: "At least one role is required",
      },
    },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    lastLoginMethod: { type: String, enum: LOGIN_METHODS },
    declarationAcceptedAt: { type: Date },
  },
  { collection: "users" }
)

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ registrationNo: 1 }, { unique: true, sparse: true })
userSchema.index({ googleSub: 1 }, { unique: true, sparse: true })
userSchema.index({ campusId: 1, roles: 1 })

export const User =
  mongoose.models.User ?? mongoose.model<UserDoc>("User", userSchema)
