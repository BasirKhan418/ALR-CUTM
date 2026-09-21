# M03 — Student Learning Record submissions

Copy everything below the line into a new agent chat.

---

Implement **M03 LR Submissions** for ALR. Read `@docs/alr-domain.md` `@docs/architecture.md`. Catalog from M02 exists. **Do not** use one fixed Theory field set. The Submit flow is driven by `course.recordConfigs`.

**This milestone only.** No faculty scoring, no plagiarism, no major-deliverable Word/PDF (those are M04/M05). For Project/Thesis/Internship **record types** that appear on a combination course, create a **draft stub card** that says “opens in M05” — do **not** fake a session-style form for them.

## Goal

Students file **Classroom**, **Applied and Action**, and **Action (Workshop)** entries against the record types their subject actually requires. Workshop logs **hours**. Every booklet-style outcome sheet includes **Books/Manuals Referred**.

## Backend

1. Model `LrEntry`:
   - studentId, courseId, termId, recordType
   - `CLASSROOM_LEARNING`: sessionDate, topic, reflection, booksManuals, hours? (optional)
   - `APPLIED_ACTION_LEARNING`: experimentNo, title, concept, planning, result, recordNotes, vivaNotes, booksManuals (rubric **marks** are Faculty-only in M04; student fills narrative)
   - `ACTION_LEARNING`: taskTitle, criticalThinking, hoursContributed, booksManuals
   - status: `DRAFT | SUBMITTED`
   - submittedAt
2. Server Actions: `upsertEntryDraft`, `submitEntry`, `listMyEntries`. Authz: enrolled student, recordType ∈ course.recordConfigs.
3. Workshop hours: `sum(hoursContributed)` per student/course. Action `getWorkshopHoursCertificateData` (JSON is enough; PDF certificate in M08).
4. Reject submit if required narrative fields empty. Books/Manuals required (can be “None”).
5. Audit log on submit.
6. Notify queue job `notify.email` may be a console stub.

## Frontend

1. Student **Submit LR** is a course picker → **tab or stepper per required record type**. Combination subjects show multiple tabs.
2. Classroom form: session fields + books/manuals.
3. Applied form: one card per experiment (add another experiment). Not one blob per term.
4. Workshop form: one card per task + numeric hours. Running total of hours on the course header. Copy: “Hours, not session count.”
5. Student list of entries with status chips.
6. Faculty **read-only** inbox of submitted entries for their courses (score controls come in M04).
7. Empty states: “This subject does not require Applied and Action Learning.”

## DB

Indexes `{ courseId, studentId, recordType, createdAt }`. No unique-per-term on Classroom/Applied/Action (many entries).

## Acceptance

- Seed student on `THEORY_PRACTICE_PROJECT` sees Classroom + Applied tabs + a Project stub, **not** Workshop.
- Student on a `WORKSHOP` course (seed one enrollment if missing) logs two tasks with hours; header shows the sum.
- Cannot submit a Practice entry on a Theory-only course.
- Books/Manuals field exists on all three live forms.
- Faculty inbox lists submissions; no score inputs yet.
- Dashboards remain uncached; course title chips may reuse catalog cache tags.
- `npm run build` succeeds.

Stop after this.
