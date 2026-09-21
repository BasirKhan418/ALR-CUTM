import mongoose, { Schema, Types } from "mongoose"

export type DepartmentDoc = {
  campusId: Types.ObjectId
  name: string
  code: string
}

const departmentSchema = new Schema<DepartmentDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
  },
  { collection: "departments" }
)

departmentSchema.index({ campusId: 1, code: 1 }, { unique: true })

export const Department =
  mongoose.models.Department ??
  mongoose.model<DepartmentDoc>("Department", departmentSchema)
