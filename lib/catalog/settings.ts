import { Setting } from "@/lib/db/models/setting"
import { connectMongo } from "@/lib/db/mongo"
import {
  CLASSROOM_COMPOSITE_DEFAULT,
  CLASSROOM_COMPOSITE_KEYS,
  CLASSROOM_COMPOSITE_SETTING,
  isValidClassroomComposites,
  type ClassroomCompositeWeights,
} from "@/lib/domain/weights"

export async function readClassroomComposites(): Promise<ClassroomCompositeWeights> {
  await connectMongo()
  const row = await Setting.findOne({ key: CLASSROOM_COMPOSITE_SETTING }).lean()
  const value = row?.value as Partial<ClassroomCompositeWeights> | undefined
  if (!value) return { ...CLASSROOM_COMPOSITE_DEFAULT }
  const next = { ...CLASSROOM_COMPOSITE_DEFAULT }
  for (const key of CLASSROOM_COMPOSITE_KEYS) {
    const parsed = Number(value[key])
    if (Number.isFinite(parsed)) next[key] = parsed
  }
  return isValidClassroomComposites(next) ? next : { ...CLASSROOM_COMPOSITE_DEFAULT }
}

export async function writeClassroomComposites(
  weights: ClassroomCompositeWeights
): Promise<ClassroomCompositeWeights> {
  if (!isValidClassroomComposites(weights)) {
    throw new Error("Classroom composites must sum to 10.")
  }
  await connectMongo()
  await Setting.findOneAndUpdate(
    { key: CLASSROOM_COMPOSITE_SETTING },
    { $set: { key: CLASSROOM_COMPOSITE_SETTING, value: weights } },
    { upsert: true }
  )
  return weights
}
