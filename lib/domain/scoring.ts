import { normalizeContribution } from "@/lib/domain/normalize"
import type { ClassroomCompositeWeights } from "@/lib/domain/weights"

export const APPLIED_CRITERIA = [
  { key: "concept", label: "Concept", max: 10 },
  { key: "planning", label: "Planning and execution", max: 10 },
  { key: "result", label: "Result and interpretation", max: 10 },
  { key: "record", label: "Record", max: 10 },
  { key: "viva", label: "Viva", max: 10 },
] as const

export const ACTION_CRITERIA = [
  { key: "criticalThinking", label: "Critical thinking / fieldwork / report", max: 50 },
  { key: "presentationViva", label: "Presentation & Viva", max: 50 },
] as const

export type AppliedCriterion = (typeof APPLIED_CRITERIA)[number]["key"]
export type ActionCriterion = (typeof ACTION_CRITERIA)[number]["key"]

export type AppliedScores = Record<AppliedCriterion, number>
export type ActionScores = Record<ActionCriterion, number>

export type ClassroomComponentMarks = {
  assignment: number
  presentation: number
  midSem: number
  recordMark: number
}

export const APPLIED_ENTRY_MAX = 50
export const ACTION_ENTRY_MAX = 100
export const CLASSROOM_ENTRY_MAX = 10

export function appliedTotal(scores: AppliedScores): number {
  return APPLIED_CRITERIA.reduce((sum, item) => sum + Number(scores[item.key] ?? 0), 0)
}

export function actionTotal(scores: ActionScores): number {
  return ACTION_CRITERIA.reduce((sum, item) => sum + Number(scores[item.key] ?? 0), 0)
}

export function classroomTotal(marks: ClassroomComponentMarks): number {
  return (
    Number(marks.assignment ?? 0) +
    Number(marks.presentation ?? 0) +
    Number(marks.midSem ?? 0) +
    Number(marks.recordMark ?? 0)
  )
}

export function validateCriterion(
  value: number,
  max: number,
  label: string
): string | null {
  if (!Number.isFinite(value) || value < 0) {
    return `${label} must be a number of 0 or more.`
  }
  if (value > max) {
    return `${label} cannot exceed ${max}.`
  }
  return null
}

export function validateAppliedScores(scores: AppliedScores): string | null {
  for (const item of APPLIED_CRITERIA) {
    const error = validateCriterion(scores[item.key], item.max, item.label)
    if (error) return error
  }
  return null
}

export function validateActionScores(scores: ActionScores): string | null {
  for (const item of ACTION_CRITERIA) {
    const error = validateCriterion(scores[item.key], item.max, item.label)
    if (error) return error
  }
  return null
}

export function validateClassroomMarks(
  marks: ClassroomComponentMarks,
  weights: ClassroomCompositeWeights
): string | null {
  const pairs = [
    ["assignment", marks.assignment, weights.assignment] as const,
    ["presentation", marks.presentation, weights.presentation] as const,
    ["mid-sem", marks.midSem, weights.midsem] as const,
    ["record", marks.recordMark, weights.record] as const,
  ]
  for (const [label, value, max] of pairs) {
    const error = validateCriterion(value, max, label)
    if (error) return error
  }
  return null
}

export function normalizeAppliedScores(totals: number[]): number {
  return normalizeContribution({
    scores: totals,
    entryMax: APPLIED_ENTRY_MAX,
    frameworkMarks: 20,
  })
}

export function normalizeActionScores(totals: number[]): number {
  return normalizeContribution({
    scores: totals,
    entryMax: ACTION_ENTRY_MAX,
    frameworkMarks: 30,
  })
}

export function scoresDiffer(
  current: Record<string, number>,
  suggested: Record<string, number> | null | undefined
): boolean {
  if (!suggested) return false
  const keys = new Set([...Object.keys(current), ...Object.keys(suggested)])
  for (const key of keys) {
    if (Number(current[key] ?? 0) !== Number(suggested[key] ?? 0)) return true
  }
  return false
}

export const STUB_APPLIED_SCORES: AppliedScores = {
  concept: 5,
  planning: 5,
  result: 5,
  record: 5,
  viva: 5,
}

export const STUB_ACTION_SCORES: ActionScores = {
  criticalThinking: 25,
  presentationViva: 25,
}
