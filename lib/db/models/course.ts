import mongoose, { Schema, Types } from "mongoose"
import { RECORD_TYPES, type RecordType } from "@/lib/domain/record-types"
import {
  COMBINATION_CODES,
  type CombinationCode,
} from "@/lib/domain/subject-map"
import {
  DELIVERY_MODES,
  type CourseRecordConfig,
  type DeliveryMode,
} from "@/lib/domain/catalog"

export type CourseDoc = {
  campusId: Types.ObjectId
  departmentId: Types.ObjectId
  programmeId: Types.ObjectId
  code: string
  title: string
  termId: Types.ObjectId
  combinationCode: CombinationCode
  deliveryMode: DeliveryMode
  recordConfigs: CourseRecordConfig[]
  createdBy: Types.ObjectId
}

const recordConfigSchema = new Schema<CourseRecordConfig>(
  {
    recordType: { type: String, enum: RECORD_TYPES, required: true },
    frameworkMarks: { type: Number, required: true },
    frameworkWeightPercent: { type: Number, required: true },
    entryMax: { type: Number, required: true },
    formulaId: {
      type: String,
      enum: ["scale_average", "classroom_composites"],
      required: true,
    },
    compositeWeights: {
      assignment: Number,
      presentation: Number,
      midsem: Number,
      record: Number,
    },
  },
  { _id: false }
)

const courseSchema = new Schema<CourseDoc>(
  {
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    programmeId: {
      type: Schema.Types.ObjectId,
      ref: "Programme",
      required: true,
    },
    code: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true },
    combinationCode: {
      type: String,
      enum: COMBINATION_CODES,
      required: true,
    },
    deliveryMode: { type: String, enum: DELIVERY_MODES, required: true },
    recordConfigs: { type: [recordConfigSchema], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { collection: "courses" }
)

courseSchema.index({ code: 1, termId: 1 }, { unique: true })
courseSchema.index({ campusId: 1, termId: 1, combinationCode: 1 })
courseSchema.index({ departmentId: 1, termId: 1 })

export type { RecordType }

export const Course =
  mongoose.models.Course ?? mongoose.model<CourseDoc>("Course", courseSchema)
