import mongoose, { Schema, Types } from "mongoose"
import { CREDIT_BASKET, CREDIT_SOURCE } from "@/lib/domain/tiers"

export type CreditLedgerDoc = {
  studentId: Types.ObjectId
  academicYear: string
  source: typeof CREDIT_SOURCE
  credits: number
  basket: typeof CREDIT_BASKET
  postedBy: Types.ObjectId
  postedAt: Date
  campusId: Types.ObjectId
  yearEvaluationId: Types.ObjectId
}

const creditLedgerSchema = new Schema<CreditLedgerDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    academicYear: { type: String, required: true, trim: true },
    source: { type: String, required: true, default: CREDIT_SOURCE },
    credits: { type: Number, required: true },
    basket: { type: String, required: true, default: CREDIT_BASKET },
    postedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    postedAt: { type: Date, required: true },
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    yearEvaluationId: {
      type: Schema.Types.ObjectId,
      ref: "YearEvaluation",
      required: true,
    },
  },
  { collection: "credit_ledger" }
)

creditLedgerSchema.index(
  { studentId: 1, academicYear: 1, source: 1 },
  { unique: true }
)

export const CreditLedger =
  mongoose.models.CreditLedger ??
  mongoose.model<CreditLedgerDoc>("CreditLedger", creditLedgerSchema)
