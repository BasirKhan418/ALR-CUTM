import mongoose, { Schema, Types } from "mongoose"

export const PROGRAMME_AWARDS = ["Diploma", "UG", "PG"] as const
export type ProgrammeAward = (typeof PROGRAMME_AWARDS)[number]

export type ProgrammeDoc = {
  campusId: Types.ObjectId
  departmentId: Types.ObjectId
  name: string
  award: ProgrammeAward
  durationYears: number
  branch?: string
  specialization?: string
}

const programmeSchema = new Schema<ProgrammeDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    name: { type: String, required: true },
    award: { type: String, enum: PROGRAMME_AWARDS, required: true },
    durationYears: { type: Number, required: true, min: 1, max: 6 },
    branch: { type: String },
    specialization: { type: String },
  },
  { collection: "programmes" }
)

programmeSchema.index({ campusId: 1, departmentId: 1, name: 1 }, { unique: true })

export const Programme =
  mongoose.models.Programme ??
  mongoose.model<ProgrammeDoc>("Programme", programmeSchema)
