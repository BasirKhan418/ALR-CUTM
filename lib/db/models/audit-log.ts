import mongoose, { Schema, Types } from "mongoose"

export type AuditLogDoc = {
  actorId?: Types.ObjectId
  action: string
  payload?: unknown
  createdAt: Date
}

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, required: false },
    action: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "audit_logs" }
)

export const AuditLog =
  mongoose.models.AuditLog ??
  mongoose.model<AuditLogDoc>("AuditLog", auditLogSchema)
