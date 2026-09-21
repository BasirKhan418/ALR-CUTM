import type { RecordType } from "@/lib/domain/record-types"

export const COMBINATION_CODES = [
  "THEORY",
  "MOOC",
  "PRACTICE",
  "WORKSHOP",
  "PROJECT",
  "THESIS",
  "INTERNSHIP",
  "THEORY_PRACTICE",
  "THEORY_PROJECT",
  "THEORY_PRACTICE_PROJECT",
  "PRACTICE_PROJECT",
  "THEORY_WORKSHOP",
] as const

export type CombinationCode = (typeof COMBINATION_CODES)[number]

export const SUBJECT_RECORD_MAP: Record<CombinationCode, readonly RecordType[]> = {
  THEORY: ["CLASSROOM_LEARNING"],
  MOOC: ["CLASSROOM_LEARNING"],
  PRACTICE: ["APPLIED_ACTION_LEARNING"],
  WORKSHOP: ["ACTION_LEARNING"],
  PROJECT: ["PROJECT_REPORT"],
  THESIS: ["THESIS_REPORT"],
  INTERNSHIP: ["INTERNSHIP_REPORT"],
  THEORY_PRACTICE: ["CLASSROOM_LEARNING", "APPLIED_ACTION_LEARNING"],
  THEORY_PROJECT: ["CLASSROOM_LEARNING", "PROJECT_REPORT"],
  THEORY_PRACTICE_PROJECT: [
    "CLASSROOM_LEARNING",
    "APPLIED_ACTION_LEARNING",
    "PROJECT_REPORT",
  ],
  PRACTICE_PROJECT: ["APPLIED_ACTION_LEARNING", "PROJECT_REPORT"],
  THEORY_WORKSHOP: ["CLASSROOM_LEARNING", "ACTION_LEARNING"],
}

export function requiredRecordTypes(code: CombinationCode): readonly RecordType[] {
  return SUBJECT_RECORD_MAP[code]
}

export const COMBINATION_LABELS: Record<CombinationCode, string> = {
  THEORY: "Theory",
  MOOC: "MOOC",
  PRACTICE: "Practice",
  WORKSHOP: "Workshop",
  PROJECT: "Project",
  THESIS: "Thesis",
  INTERNSHIP: "Internship",
  THEORY_PRACTICE: "Theory + Practice",
  THEORY_PROJECT: "Theory + Project",
  THEORY_PRACTICE_PROJECT: "Theory + Practice + Project",
  PRACTICE_PROJECT: "Practice + Project",
  THEORY_WORKSHOP: "Theory + Workshop",
}

export function combinationLabel(code: CombinationCode | string): string {
  return COMBINATION_LABELS[code as CombinationCode] ?? code
}

export function isCombinationCode(value: string): value is CombinationCode {
  return (COMBINATION_CODES as readonly string[]).includes(value)
}
