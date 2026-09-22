import assert from "node:assert/strict"
import { test } from "node:test"
import { buildExamCellYearExport } from "./exam-cell.ts"

test("exam-cell JSON contains student, year, marks, credits, and campus", () => {
  const doc = buildExamCellYearExport({
    campusId: "campus",
    campusName: "Bhubaneswar",
    academicYear: "2024-25",
    rows: [
      {
        student: {
          id: "student",
          name: "Bhubaneswar Student",
          email: "student.bbsr@cutm.ac.in",
          registrationNo: "BBSR-STU-001",
        },
        year: "2024-25",
        marks: { total: 80, criteria: [] },
        credits: 1,
        campus: "Bhubaneswar",
      },
    ],
    exportedAt: "2026-09-22T00:00:00.000Z",
  })
  const row = doc.rows[0]
  assert.ok(row)
  assert.equal(row.student.name, "Bhubaneswar Student")
  assert.equal(row.year, "2024-25")
  assert.equal(row.marks.total, 80)
  assert.equal(row.credits, 1)
  assert.equal(row.campus, "Bhubaneswar")
  assert.equal(doc.campus.name, "Bhubaneswar")
})
