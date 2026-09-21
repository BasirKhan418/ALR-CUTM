import type { RecordType } from "@/lib/domain/record-types"

export type RecordWeight = {
  frameworkMarks: number
  frameworkWeightPercent: number
  entryMax: number
  formulaId: "scale_average" | "classroom_composites"
}

export const RECORD_WEIGHTS: Record<RecordType, RecordWeight> = {
  CLASSROOM_LEARNING: {
    frameworkMarks: 10,
    frameworkWeightPercent: 10,
    entryMax: 10,
    formulaId: "classroom_composites",
  },
  APPLIED_ACTION_LEARNING: {
    frameworkMarks: 20,
    frameworkWeightPercent: 20,
    entryMax: 50,
    formulaId: "scale_average",
  },
  ACTION_LEARNING: {
    frameworkMarks: 30,
    frameworkWeightPercent: 30,
    entryMax: 100,
    formulaId: "scale_average",
  },
  PROJECT_REPORT: {
    frameworkMarks: 30,
    frameworkWeightPercent: 30,
    entryMax: 30,
    formulaId: "scale_average",
  },
  THESIS_REPORT: {
    frameworkMarks: 30,
    frameworkWeightPercent: 30,
    entryMax: 30,
    formulaId: "scale_average",
  },
  INTERNSHIP_REPORT: {
    frameworkMarks: 30,
    frameworkWeightPercent: 30,
    entryMax: 30,
    formulaId: "scale_average",
  },
}

export const CLASSROOM_COMPOSITE_KEYS = [
  "assignment",
  "presentation",
  "midsem",
  "record",
] as const

export type ClassroomCompositeKey = (typeof CLASSROOM_COMPOSITE_KEYS)[number]

export type ClassroomCompositeWeights = Record<ClassroomCompositeKey, number>

export const CLASSROOM_COMPOSITE_DEFAULT: ClassroomCompositeWeights = {
  assignment: 2.5,
  presentation: 2.5,
  midsem: 2.5,
  record: 2.5,
}

export const CLASSROOM_COMPOSITE_LABELS: Record<ClassroomCompositeKey, string> = {
  assignment: "Assignment",
  presentation: "Presentation",
  midsem: "Mid-sem",
  record: "Record",
}

export const CLASSROOM_COMPOSITE_SETTING = "classroom_composite_weights"

export function classroomCompositeSum(weights: ClassroomCompositeWeights): number {
  return CLASSROOM_COMPOSITE_KEYS.reduce((sum, key) => sum + Number(weights[key] ?? 0), 0)
}

export function isValidClassroomComposites(
  weights: ClassroomCompositeWeights
): boolean {
  return Math.abs(classroomCompositeSum(weights) - 10) < 0.001
}
