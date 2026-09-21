# M08 — Campus analytics, booklet export, system health

Copy everything below the line into a new agent chat.

---

Implement **M08 Analytics & Exports** for ALR. Read `@docs/alr-domain.md` `@docs/architecture.md`. Marks, cases, and credits already exist. Accreditation export must look like a **booklet**, not a CSV dump.

**This milestone only.** Archival policy polish is M09. Auth stays email+OTP + Google (already in M01).

## Goal

HoD/Admin analytics filter across the six campuses. A student can download an accreditation-ready Learning Record compile (cover, certificate, declaration, index, rubric sheet). Workshop hours certificate. Admin sees plagiarism API / queue headroom.

## Backend

1. Read-model helpers in `lib/services/analytics.ts` (Mongo aggregation):
   - submissions by record type
   - average normalized scores
   - overdue sign-offs
   - open plagiarism cases
   - ALR credits posted vs expected
   - workshop hours
   All functions take `{ campusId?, departmentId?, termId?, programmeId? }`.
2. HoD forced to their campus+departments; Admin/Dean may pick any of the six campuses or “All”.
3. BullMQ `export.booklet`:
   - Input: studentId, academicYear | `PROGRAM`
   - Output: PDF stored as `File`
   - Sections **in order**: cover (university, campus, student, programme, year), certificate page, declaration (accepted text + timestamp), index of components, per-record excerpts, rubric sheet (five-criterion if year/program scored), credit line (1/year)
   - Use a PDF library (e.g. `@react-pdf/renderer` or `pdf-lib`). Keep layout sober and print-A4.
4. Workshop hours certificate job or same queue: name, course, total hours, date range.
5. Reuse exam-cell export from M07 on the Admin exports page.
6. Health: extend `/api/health` with queue depth, failed jobs, `rl:plagiarism` usage %, booklet job count. Page is Admin-only.

## Frontend

1. `/hod/analytics` and `/admin/analytics`: campus select (six names exactly), department, term. Cards + simple tables (no heavy chart lib required; a small CSS bar is fine).
2. Empty campus filter must not leak other campuses’ students.
3. Student `/student/exports`: request booklet (year or full program), job progress, download link.
4. Faculty/HoD can request a booklet for a student in their scope.
5. Admin `/admin/health`: gauges for Valkey plagiarism cap (call out “plan headroom before term end”), BullMQ failed, mongo/valkey ping.
6. Analytics pages are **dynamic** (no CDN cache). Optional short Valkey cache `analytics:{hash}` TTL 60s if aggregations are slow — never `"use cache"` on these.

## Acceptance

- Switching campus from Bhubaneswar to Balasore changes every number; no mixed rows.
- Booklet PDF has the five named sections; declaration matches the accepted version.
- Workshop certificate shows summed hours from M03 entries.
- Admin health shows a numeric % of plagiarism hourly cap.
- Student from campus A cannot download campus B analytics (no admin).
- `npm run build` succeeds.

Stop after this.
