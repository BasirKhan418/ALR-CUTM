import { normalizeContribution } from "@/lib/domain/normalize"
import { recordTypeLabel, type RecordType } from "@/lib/domain/record-types"
import {
  COMBINATION_CODES,
  requiredRecordTypes,
  type CombinationCode,
} from "@/lib/domain/subject-map"
import {
  CLASSROOM_COMPOSITE_DEFAULT,
  RECORD_WEIGHTS,
  type ClassroomCompositeWeights,
} from "@/lib/domain/weights"

export const DELIVERY_MODES = [
  "THEORY",
  "MOOC",
  "PRACTICE",
  "WORKSHOP",
  "PROJECT",
  "THESIS",
  "INTERNSHIP",
] as const

export type DeliveryMode = (typeof DELIVERY_MODES)[number]

export type CourseRecordConfig = {
  recordType: RecordType
  frameworkMarks: number
  frameworkWeightPercent: number
  entryMax: number
  formulaId: "scale_average" | "classroom_composites"
  compositeWeights?: ClassroomCompositeWeights
}

export function deliveryModeFor(code: CombinationCode): DeliveryMode {
  if (code === "MOOC") return "MOOC"
  if (code === "PRACTICE" || code === "PRACTICE_PROJECT") return "PRACTICE"
  if (code === "WORKSHOP") return "WORKSHOP"
  if (code === "PROJECT") return "PROJECT"
  if (code === "THESIS") return "THESIS"
  if (code === "INTERNSHIP") return "INTERNSHIP"
  return "THEORY"
}

export function buildRecordConfigs(
  code: CombinationCode,
  composites: ClassroomCompositeWeights = CLASSROOM_COMPOSITE_DEFAULT
): CourseRecordConfig[] {
  return requiredRecordTypes(code).map((recordType) => {
    const weight = RECORD_WEIGHTS[recordType]
    return {
      recordType,
      frameworkMarks: weight.frameworkMarks,
      frameworkWeightPercent: weight.frameworkWeightPercent,
      entryMax: weight.entryMax,
      formulaId: weight.formulaId,
      ...(recordType === "CLASSROOM_LEARNING"
        ? { compositeWeights: { ...composites } }
        : {}),
    }
  })
}

export function formulaSentence(config: CourseRecordConfig): string {
  if (config.formulaId === "classroom_composites") {
    const split = config.compositeWeights ?? CLASSROOM_COMPOSITE_DEFAULT
    return `Assignment ${split.assignment}, presentation ${split.presentation}, mid-sem ${split.midsem}, and record ${split.record} sum to ${config.frameworkMarks} marks (${config.frameworkWeightPercent}%).`
  }
  if (config.recordType === "APPLIED_ACTION_LEARNING") {
    return `Average of experiment scores (max ${config.entryMax}) is scaled to ${config.frameworkMarks} marks (${config.frameworkWeightPercent}%).`
  }
  if (config.recordType === "ACTION_LEARNING") {
    return `Average of task scores (max ${config.entryMax}) is scaled to ${config.frameworkMarks} marks (${config.frameworkWeightPercent}%).`
  }
  return `Average of scores (max ${config.entryMax}) is scaled to ${config.frameworkMarks} marks (${config.frameworkWeightPercent}%).`
}

export function exampleNormalization(config: CourseRecordConfig): {
  scores: number[]
  result: number
  caption: string
} {
  if (config.formulaId === "classroom_composites") {
    return {
      scores: [config.frameworkMarks],
      result: config.frameworkMarks,
      caption: `${recordTypeLabel(config.recordType)} composites already sit on the ${config.frameworkMarks}-mark Framework scale.`,
    }
  }
  const scores =
    config.recordType === "APPLIED_ACTION_LEARNING"
      ? [40, 50]
      : config.recordType === "ACTION_LEARNING"
        ? [80]
        : [24]
  const result = normalizeContribution({
    scores,
    entryMax: config.entryMax,
    frameworkMarks: config.frameworkMarks,
  })
  return {
    scores,
    result,
    caption: `Example: mean of ${scores.join(" + ")} out of ${config.entryMax} → ${result} / ${config.frameworkMarks}.`,
  }
}

export function previewForCombination(
  code: CombinationCode,
  composites: ClassroomCompositeWeights = CLASSROOM_COMPOSITE_DEFAULT
) {
  const configs = buildRecordConfigs(code, composites)
  return {
    code,
    deliveryMode: deliveryModeFor(code),
    configs,
    sentences: configs.map(formulaSentence),
  }
}

export { COMBINATION_CODES }
