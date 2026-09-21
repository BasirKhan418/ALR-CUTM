# M05 — Major / Capstone deliverables + sign-off + internship token

Copy everything below the line into a new agent chat.

---

Implement **M05 Major Deliverables** for ALR. Read `@docs/alr-domain.md` `@docs/architecture.md`. Sign-off is a **collection of sequential steps**, never a boolean `submitted`.

**This milestone only.** Plagiarism scoring can store a placeholder report row; real detector + cases are M06. Year/program committees are M07.

## Goal

One record per Project / Internship / PG Thesis (not per session). Multi-candidate (up to 3). Word **and** PDF required. Digital sign-off chain. Industry Supervisor token path. Internship Internal 50% + External 50% auto-total. PG Thesis gated on Paper Publication Report.

## Backend

1. `MajorDeliverable`: type `MINOR_PROJECT|MAJOR_PROJECT|INTERNSHIP|PG_THESIS`; candidateIds[1..3] + registration snapshots; campus/dept/programme/branch/specialization; title; supervisorId; coSupervisorId?; industrySupervisor { name, email, org }; wordFileId; pdfFileId; status machine from domain; internScores { internal?, external?, total? }; coAttainment { json or structured COs }; rubricScores (30-pt).
2. `File` metadata + store bytes under `FILE_DIR` (or MinIO if already present). MIME allowlist: docx + pdf. Both files required before `SUBMITTED`.
3. `Signoff` { targetType, targetId, stepOrder, role, actorId?, decision, reason, at }. Build chain from domain:
   - Major: Student → Supervisor → Co-supervisor (omit step if none) → HoD (Dean if no HoD configured)
4. `PaperPublication` for PG_THESIS: title, venue, proofFileId; chain Candidate → Supervisor/Co-supervisor → HoD. Thesis action `submitForEvaluation` **rejects** unless publication is fully approved.
5. Industry tokens: create hashed token in Mongo + Valkey `token:industry:{hash}` TTL 14d. Route `app/api/industry/[token]/route.ts` + public page `app/(public)/industry/[token]`. No university login. Fields: attendance, stipend, taskCompletion, feedback, externalScore /50. After save, recompute internship total = internal/50*50% + external/50*50% on a 30-pt report scale (document the mapping in `lib/domain/internship.ts`: internal and external each contribute half of 30).
6. Faculty Supervisor enters internal score /50. UI shows both halves and auto-total when both present. No manual “final” field.
7. Server Actions for create/update draft, add candidate, upload files, submit, decideSignoff (Valkey `lock:signoff:{id}`), issueIndustryToken, upsertCoAttainment.
8. Only candidates can edit draft. Sign-off order is enforced. Returned status sends back to previous editable state with reason.
9. `notify` job stub on each sign-off.

## Frontend

1. Student: “Major deliverable” from the Project/Thesis/Internship tab stub in M03 — now a real wizard (team, title, files, supervisors).
2. File dropzone labelled **Word (required)** and **PDF (required)**. Block submit if either missing.
3. Sign-off stepper showing who/when/decision.
4. Supervisor / Co-supervisor / HoD queues: Approve / Return / Reject + reason.
5. Faculty CO Attainment sheet on the deliverable (structured rows).
6. Public industry page: CUTM branding, internship title, student names, the four fields + score. Token invalid/expired state.
7. PG Thesis: publication sub-record UI + lock message until endorsed.
8. Multi-candidate: three name slots; shared one record — **no** duplicate-record workaround.

## Acceptance

- Two students share one Major Project record; both names on the cover fields.
- Submit without PDF fails; with both files reaches Supervisor.
- Co-supervisor step skipped when empty; present when set.
- Return from HoD is visible to students with reason; re-submit continues the chain (do not delete history — append new steps).
- Industry token works logged-out; saving external score + internal score produces one total.
- PG Thesis cannot enter `SUBMITTED_FOR_EVALUATION` without publication sign-off.
- `npm run build` succeeds.

Stop after this.
