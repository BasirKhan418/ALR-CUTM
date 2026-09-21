import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CODE_JOB,
  DEFAULT_PLAGIARISM_THRESHOLDS,
  PROSE_JOB,
  canRecommendOnCase,
  canRespondToCase,
  reportStatusForScore,
  scoreAfterExclusions,
} from "./plagiarism.ts"

test("thesis default threshold is 20 and project is 30", () => {
  assert.equal(DEFAULT_PLAGIARISM_THRESHOLDS.THESIS, 20)
  assert.equal(DEFAULT_PLAGIARISM_THRESHOLDS.PROJECT, 30)
})

test("excluding matches can drop a flagged score below the threshold", () => {
  const matches = [
    { id: "a", sourceLabel: "Paper A", overlap: 24 },
    { id: "b", sourceLabel: "Paper B", overlap: 18 },
  ]
  const raw = 36
  assert.equal(scoreAfterExclusions(matches, [], raw), 36)
  const next = scoreAfterExclusions(matches, [{ matchId: "a" }], raw)
  assert.ok(next < 20)
  assert.equal(reportStatusForScore(next, 20, false), "CLEAR")
})

test("programming uses the code job name, never the prose job", () => {
  assert.equal(CODE_JOB, "plagiarism.code")
  assert.equal(PROSE_JOB, "plagiarism.prose")
  assert.notEqual(CODE_JOB, PROSE_JOB)
})

test("excluding every match marks the report excluded at 0", () => {
  const matches = [{ id: "a", sourceLabel: "Paper A", overlap: 40 }]
  const next = scoreAfterExclusions(matches, [{ matchId: "a" }], 40)
  assert.equal(next, 0)
  assert.equal(reportStatusForScore(next, 30, true), "EXCLUDED")
})

test("the student cannot respond after the timer expires", () => {
  assert.equal(canRespondToCase("OPEN", false), true)
  assert.equal(canRespondToCase("OPEN", true), false)
  assert.equal(canRespondToCase("COMMITTEE_RECOMMENDED", false), false)
})

test("committee waits for the student unless the window expired", () => {
  assert.equal(canRecommendOnCase("OPEN", false), false)
  assert.equal(canRecommendOnCase("OPEN", true), true)
  assert.equal(canRecommendOnCase("STUDENT_RESPONDED", false), true)
})
