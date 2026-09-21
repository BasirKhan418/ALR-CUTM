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

export const CLASSROOM_COMPOSITE_DEFAULT = {
  assignment: 2.5,
  presentation: 2.5,
  midsem: 2.5,
  record: 2.5,
} as const
