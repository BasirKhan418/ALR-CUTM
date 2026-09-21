import mongoose, { Schema } from "mongoose"

export type CampusDoc = {
  slug: string
  name: string
  active: boolean
}

const campusSchema = new Schema<CampusDoc>(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { collection: "campuses" }
)

export const Campus =
  mongoose.models.Campus ?? mongoose.model<CampusDoc>("Campus", campusSchema)
