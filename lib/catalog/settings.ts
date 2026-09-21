import { Setting } from "@/lib/db/models/setting"
import { connectMongo } from "@/lib/db/mongo"
import {
  DEFAULT_PLAGIARISM_THRESHOLDS,
  HOURLY_CAP_SETTING,
  PLAGIARISM_DOCUMENT_TYPES,
  PLAGIARISM_HOURLY_CAP_DEFAULT,
  THRESHOLDS_SETTING,
  type PlagiarismDocumentType,
} from "@/lib/domain/plagiarism"
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

export async function readPlagiarismThresholds(): Promise<
  Record<PlagiarismDocumentType, number>
> {
  await connectMongo()
  const row = await Setting.findOne({ key: THRESHOLDS_SETTING }).lean()
  const value = (row?.value ?? {}) as Partial<Record<PlagiarismDocumentType, number>>
  const next = { ...DEFAULT_PLAGIARISM_THRESHOLDS }
  for (const type of PLAGIARISM_DOCUMENT_TYPES) {
    const parsed = Number(value[type])
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
      next[type] = parsed
    }
  }
  return next
}

export async function writePlagiarismThresholds(
  thresholds: Record<PlagiarismDocumentType, number>
) {
  for (const type of PLAGIARISM_DOCUMENT_TYPES) {
    const value = thresholds[type]
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error("Each plagiarism threshold must be between 0 and 100.")
    }
  }
  await connectMongo()
  await Setting.findOneAndUpdate(
    { key: THRESHOLDS_SETTING },
    { $set: { key: THRESHOLDS_SETTING, value: thresholds } },
    { upsert: true }
  )
  return thresholds
}

export async function readPlagiarismHourlyCap() {
  await connectMongo()
  const row = await Setting.findOne({ key: HOURLY_CAP_SETTING }).lean()
  const value = Number(row?.value)
  return Number.isFinite(value) && value > 0 ? value : PLAGIARISM_HOURLY_CAP_DEFAULT
}

export async function writePlagiarismHourlyCap(cap: number) {
  if (!Number.isFinite(cap) || cap < 1) {
    throw new Error("Hourly plagiarism cap must be at least 1.")
  }
  await connectMongo()
  await Setting.findOneAndUpdate(
    { key: HOURLY_CAP_SETTING },
    { $set: { key: HOURLY_CAP_SETTING, value: cap } },
    { upsert: true }
  )
  return cap
}
