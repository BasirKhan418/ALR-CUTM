# M07 — Year-wise + program-wise evaluation + credit ledger

Copy everything below the line into a new agent chat.

---

Implement **M07 Tiers & Credits** for ALR. Read `@docs/alr-domain.md` `@docs/architecture.md`. This is **High priority**. Program-wise is a **workflow**, not a transcript page.

**This milestone only.** Pretty booklet PDF and rich analytics are M08; here exam-cell export can be JSON/CSV downloaded via a Route Handler.

## Goal

Three tiers exist in data and UI. Year-wise committee uses the 100-mark five-criterion rubric and posts **1 ALR credit** to the Compulsory Basket. Program-wise committee cumulates years, posts final mark, exports to exam cell. Mentor signs PO/PSO; Faculty signs CO.

## Rubric (100)

Coverage of Courses 20, Coverage of Components 20, Quality of Content 20, Aesthetics 20, Presentation & Discussion 20.

`settings.yearWiseUsesFiveCriterion` and `programWiseUsesFiveCriterion` (seed true). Dean can toggle; both UIs support the rubric.

## Backend

1. `YearEvaluation`: studentId, academicYear, campusId, programmeId, compiledComponentIds (lr + deliverables), committeeIds, rubricScores, mentorPoPso { signedBy, at, sheet }, facultyCoRefs[], creditPosted, examCellExport { at, payloadRef, status }, status `DRAFT|COMMITTEE_ASSIGNED|SCORED|SIGNED|EXPORTED`.
2. `ProgramEvaluation`: studentId, yearEvaluationIds[], committeeIds, cumulatedMark, finalMark, examCellExport, status.
3. `CreditLedger`: unique `{ studentId, academicYear, source: 'ALR_YEAR' }`, credits: 1, basket: `COMPULSORY_ALR`, postedBy, postedAt. Programme `durationYears` is the expected total (e.g. 4).
4. Dean Actions: `constituteYearCommittee`, `constituteProgramCommittee`, `scoreYearRubric`, `signYear`, `postYearCredit`, `exportYearToExamCell`, same for program (`cumulate` then export). Faculty Action: attach/sign CO on year compile. Mentor Action: sign PO/PSO sheet (Mentor role required — Faculty-only users cannot).
5. Signoffs appended on year/program targets.
6. BullMQ `exports` job `export.exam-cell` writes a JSON file + marks export status. Route Handler `GET /api/exports/exam-cell?year=&campus=` (Admin/Dean/Exam-cell role) streams it.
7. Cannot post a second credit for the same student/year (unique index).
8. Student sees credit ledger (year rows + running total vs durationYears). This is still not “the program-wise workflow” — committee pages are separate.

## Frontend

1. Dean: pick campus/year, assign committee, see compiled components list (links to records).
2. Committee: five-criterion form + comments + sign.
3. Mentor queue: “PO/PSO attainment” per student-year. Faculty queue: “CO attainment” already on records — year view lists what’s signed/missing.
4. Dean: Program-wise board — students who have all year evaluations SIGNED; cumulated table; final mark; export button.
5. Student: **Credits** page — Compulsory Basket, 1 / year, expected total, exam-cell export status (not editable).
6. HoD: read-only year status for their department.

## Acceptance

- Year sign-off posts exactly 1 credit; repeat is rejected.
- 4-year programme student with 2 signed years shows 2 / 4 compulsory ALR credits.
- Program-wise cumulation equals configured year marks (document formula in `lib/domain/cumulate.ts` — default equal-weight mean of year rubric totals scaled as Dean settings allow).
- Mentor can sign PO/PSO; a Faculty without Mentor role cannot.
- Exam-cell JSON contains student, year, marks, credits, campus.
- Committee assignment + timestamps stored in `signoffs`.
- `npm run build` succeeds.

Stop after this.
