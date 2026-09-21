import mongoose, { Schema } from "mongoose"

export type TermDoc = {
  name: string
  startsAt: Date
  endsAt: Date
  academicYear: string
}

const termSchema = new Schema<TermDoc>(
  {
    name: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    academicYear: { type: String, required: true },
  },
  { collection: "terms" }
)

termSchema.index({ academicYear: 1, name: 1 }, { unique: true })

export const Term =
  mongoose.models.Term ?? mongoose.model<TermDoc>("Term", termSchema)
