import mongoose, { Schema } from "mongoose"

export type SettingDoc = {
  key: string
  value: unknown
}

const settingSchema = new Schema<SettingDoc>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { collection: "settings" }
)

export const Setting =
  mongoose.models.Setting ?? mongoose.model<SettingDoc>("Setting", settingSchema)
