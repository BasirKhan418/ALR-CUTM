import assert from "node:assert/strict"
import { test } from "node:test"
import { normalizeContribution } from "./normalize.ts"

test("Applied and Action Learning: mean of 40 and 50 out of 50 scales to 18 / 20", () => {
  assert.equal(
    normalizeContribution({
      scores: [40, 50],
      entryMax: 50,
      frameworkMarks: 20,
    }),
    18
  )
})

test("Action Learning: 80 out of 100 scales to 24 / 30", () => {
  assert.equal(
    normalizeContribution({
      scores: [80],
      entryMax: 100,
      frameworkMarks: 30,
    }),
    24
  )
})

test("empty scores normalize to 0", () => {
  assert.equal(
    normalizeContribution({ scores: [], entryMax: 50, frameworkMarks: 20 }),
    0
  )
})
