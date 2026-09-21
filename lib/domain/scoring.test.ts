import assert from "node:assert/strict"
import { test } from "node:test"
import { normalizeContribution } from "./normalize.ts"
import { CLASSROOM_COMPOSITE_DEFAULT } from "./weights.ts"

function appliedTotal(scores: {
  concept: number
  planning: number
  result: number
  record: number
  viva: number
}) {
  return (
    scores.concept +
    scores.planning +
    scores.result +
    scores.record +
    scores.viva
  )
}

function actionTotal(scores: {
  criticalThinking: number
  presentationViva: number
}) {
  return scores.criticalThinking + scores.presentationViva
}

function classroomTotal(marks: {
  assignment: number
  presentation: number
  midSem: number
  recordMark: number
}) {
  return marks.assignment + marks.presentation + marks.midSem + marks.recordMark
}

function validateClassroomMarks(
  marks: {
    assignment: number
    presentation: number
    midSem: number
    recordMark: number
  },
  weights: {
    assignment: number
    presentation: number
    midsem: number
    record: number
  }
) {
  const pairs = [
    ["assignment", marks.assignment, weights.assignment] as const,
    ["presentation", marks.presentation, weights.presentation] as const,
    ["mid-sem", marks.midSem, weights.midsem] as const,
    ["record", marks.recordMark, weights.record] as const,
  ]
  for (const [label, value, max] of pairs) {
    if (!Number.isFinite(value) || value < 0) {
      return `${label} must be a number of 0 or more.`
    }
    if (value > max) return `${label} cannot exceed ${max}.`
  }
  return null
}

test("two Applied experiments 40 and 50 average to 45 and normalize to 18 / 20", () => {
  const first = appliedTotal({
    concept: 8,
    planning: 8,
    result: 8,
    record: 8,
    viva: 8,
  })
  const second = appliedTotal({
    concept: 10,
    planning: 10,
    result: 10,
    record: 10,
    viva: 10,
  })
  assert.equal(first, 40)
  assert.equal(second, 50)
  assert.equal(
    normalizeContribution({
      scores: [first, second],
      entryMax: 50,
      frameworkMarks: 20,
    }),
    18
  )
})

test("one Workshop task 80 / 100 normalizes to 24 / 30", () => {
  const total = actionTotal({
    criticalThinking: 40,
    presentationViva: 40,
  })
  assert.equal(total, 80)
  assert.equal(
    normalizeContribution({
      scores: [total],
      entryMax: 100,
      frameworkMarks: 30,
    }),
    24
  )
})

test("classroom 2+2+3+3 sums to 10 on a 2/2/3/3 split", () => {
  const marks = {
    assignment: 2,
    presentation: 2,
    midSem: 3,
    recordMark: 3,
  }
  assert.equal(classroomTotal(marks), 10)
  assert.equal(
    validateClassroomMarks(marks, {
      assignment: 2,
      presentation: 2,
      midsem: 3,
      record: 3,
    }),
    null
  )
})

test("classroom marks cannot exceed the course split", () => {
  assert.match(
    validateClassroomMarks(
      {
        assignment: 3,
        presentation: 2.5,
        midSem: 2.5,
        recordMark: 2.5,
      },
      CLASSROOM_COMPOSITE_DEFAULT
    ) ?? "",
    /assignment cannot exceed 2.5/i
  )
})
