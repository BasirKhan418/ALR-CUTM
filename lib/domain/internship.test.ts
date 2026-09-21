import assert from "node:assert/strict"
import { test } from "node:test"
import {
  internshipReportTotal,
  validateInternshipHalf,
} from "./internship.ts"

test("internal 40 and external 40 total 24 / 30", () => {
  assert.equal(internshipReportTotal(40, 40), 24)
})

test("internal 50 and external 50 total 30 / 30", () => {
  assert.equal(internshipReportTotal(50, 50), 30)
})

test("only one half present is not a complete total in the UI, but math is half of 30", () => {
  assert.equal(internshipReportTotal(50, 0), 15)
})

test("external score cannot exceed 50", () => {
  assert.match(validateInternshipHalf(51, "External score") ?? "", /cannot exceed 50/)
})
