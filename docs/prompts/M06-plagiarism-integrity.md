# M06 — Plagiarism, exclusions, cases, code similarity

Copy everything below the line into a new agent chat.

---

Implement **M06 Integrity** for ALR. Read `@docs/alr-domain.md` `@docs/architecture.md`. Deliverable files from M05 exist. **Do not** ship a real exploit or a scraped Turnitin client. Use a **provider interface** + a local stub/provider that computes a similarity score (e.g. token overlap / optional JPlag CLI if present). Queue everything on BullMQ. Respect Valkey rate limits.

**This milestone only.** No year/program evaluation.

## Goal

Per-document-type plagiarism thresholds, supervisor-certified exclusions, a real case-management workflow (not a Flagged chip), and a **separate** code-similarity queue for Programming Practice.

## Thresholds

`settings.plagiarismThresholds`:

| documentType | default |
| --- | --- |
| `THESIS` | 20 |
| `PROJECT` | 30 |
| `INTERNSHIP` | 30 |
| `CLASSROOM_LEARNING` | 30 |
| `APPLIED_ACTION_LEARNING` | 30 |
| `ACTION_LEARNING` | 30 |
| `PROGRAMMING` | 30 (code engine) |

Admin UI can edit these. Thesis default must seed at 20.

## Backend

1. `PlagiarismReport`: targetType/id, tool (`STUB_PROSE` | `STUB_CODE` | future `TURNITIN`), score, thresholdApplied, status `CLEAR|FLAGGED|EXCLUDED`, matches[], exclusions[].
2. Exclusion: `{ matchId, reason, certificateFileId, bySupervisorId, at }` → those matches **do not** count in score used for flagging.
3. On major-deliverable submit (and optional LR submit), enqueue `plagiarism.prose`. Programming uploads enqueue `plagiarism.code` — **never** the prose processor.
4. Rate limiter: incr `rl:plagiarism:{campus}:{hour}`. If over `settings.plagiarismHourlyCap` (seed 100), delay/retry job. Admin health already exists — add current usage % (review called out 78%).
5. If score > threshold after exclusions → create `PlagiarismCase`:
   - committee member ids (Dean/Admin assigns)
   - **cannot include** the student’s Supervisor/Guide
   - `responseDueAt` (default 7 days)
   - studentResponse
   - recommendation
   - status `OPEN → STUDENT_RESPONDED → COMMITTEE_RECOMMENDED → COUNCIL_RATIFIED | DISMISSED`
6. Repeatable `maintenance` job closes response window (`plagiarism.case.timeout`).
7. Deliverable status moves to `UNDER_COMMITTEE_REVIEW` while a case is open.
8. Server Actions for exclude-match, assign-case-committee, respond, recommend, ratify. All audited.

## Frontend

1. Report panel on the deliverable: score, tool, threshold, match list, exclude action (Supervisor + certificate upload).
2. Student: case page with timer + response box.
3. Dean/Admin: case queue, committee picker (guides of that student filtered **out**), ratification.
4. Admin settings: per-type thresholds + hourly cap + health gauge (Valkey counters + BullMQ waiting/failed).
5. Programming Practice: if M03 has no programming record yet, add `PROGRAMMING` as an optional entry type on Practice courses **or** a dedicated upload on Applied entries flagged `isCode`. Keep it small: one zip upload → code-similarity job → score.

## Provider interface

```ts
interface SimilarityProvider {
  kind: 'prose' | 'code'
  analyze(input: { files: { path: string; mime: string }[] }): Promise<{ score: number; matches: Match[] }>
}
```

Stub prose: hashed-shingle overlap against other files in the same term. Stub code: line/token overlap. Swap later without UI changes.

## Acceptance

- Thesis uses 20% unless Admin changes it; Project uses 30%.
- Excluding matches can drop a flagged report to CLEAR without deleting evidence.
- Opening a case blocks the guide from sitting on the committee.
- Response timer expiry is visible and job-driven.
- Programming file never hits the prose queue (assert via job name in audit or admin job list).
- Health panel shows hourly plagiarism usage %.
- `npm run build` succeeds.

Stop after this.
