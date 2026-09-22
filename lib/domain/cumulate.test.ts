import assert from "node:assert/strict"
import { test } from "node:test"
import { cumulateYearMarks, describeCumulation } from "./cumulate.ts"
import { parseRubricMarks, rubricTotal, YEAR_CRITERIA } from "./tiers.ts"

test("program cumulation is the equal-weight mean scaled by the dean setting", () => {
  assert.equal(cumulateYearMarks([80, 90], 100), 85)
  assert.equal(cumulateYearMarks([80, 90], 50), 42.5)
  assert.equal(cumulateYearMarks([80], 100), 80)
  assert.equal(cumulateYearMarks([], 100), 0)
})

test("cumulation sentence names the years and the scale", () => {
  assert.match(describeCumulation([80, 90], 100), /85/)
  assert.match(describeCumulation([80, 90], 100), /scale/)
})

test("five-criterion rubric totals 100 and rejects a mark above 20", () => {
  const scores = YEAR_CRITERIA.map((criterion) => ({
    criterionId: criterion.id,
    marks: 16,
    comment: "",
  }))
  const parsed = parseRubricMarks(scores)
  assert.equal(parsed.ok, true)
  if (parsed.ok) assert.equal(rubricTotal(parsed.scores), 80)
  const over = parseRubricMarks(
    YEAR_CRITERIA.map((criterion) => ({
      criterionId: criterion.id,
      marks: criterion.id === "aesthetics" ? 21 : 10,
    }))
  )
  assert.equal(over.ok, false)
})
