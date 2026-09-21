# M04 — Subject-wise evaluation, composites, AI assist, overrides

Copy everything below the line into a new agent chat.

---

Implement **M04 Evaluation & Scoring** for ALR. Read `@docs/alr-domain.md` `@docs/architecture.md`. Entries from M03 exist. Scoring must go through `lib/domain/normalize.ts`. **Never** display a raw average as the subject contribution.

**This milestone only.** No plagiarism cases, no year/program committees.

## Goal

Course Faculty score entries with the booklet rubrics, enter Classroom’s four composite components, optionally run AI assist via BullMQ, and override AI with a reason the student can see. Subject dashboards show raw → formula → normalized Framework weight.

## Rubrics (hard)

- Applied experiment: Concept 10 + Planning 10 + Result 10 + Record 10 + Viva 10 = **50**.
- Workshop task: Critical thinking/fieldwork/report 50 + Presentation & Viva 50 = **100**.
- Classroom subject contribution: Assignment + Presentation + Mid-Sem + Record, weights from course `compositeWeights`, sum **10**.
- Normalized: Applied mean/50*20; Action mean/100*30; Classroom composites already on the 10-point Framework scale.

## Backend

1. Extend `LrEntry` with `facultyScores` (per-criterion), `facultyRemarks`, `scoredBy`, `scoredAt`.
2. Model `ClassroomComponents` (one per student/course/term): assignment, presentation, midSem, recordMark, source `MANUAL` (LMS later).
3. Model `SubjectScore`: studentId, courseId, recordType, rawAverage, entryMax, frameworkMarks, normalized, formulaId, computedAt.
4. Model `AiScoreRun`: entryId, provider, rawOutput, suggestedScores, status `QUEUED|DONE|FAILED`, override { by, reason, at, finalScores }.
5. Server Actions: `scoreAppliedEntry`, `scoreActionEntry`, `upsertClassroomComponents`, `recomputeSubjectScore`, `enqueueAiScore`, `overrideAiScore`.
6. `recomputeSubjectScore` is the only writer of `SubjectScore`. Call it after every score/override.
7. BullMQ `scoring` queue, job `ai.score.entry`. Processor may be a **deterministic stub** (e.g. midpoint marks + “stub AI”) so the pipeline is real. Store run + `job:progress:{id}` in Valkey.
8. Student may see scores + override reason; cannot see stub chain-of-thought dumps.
9. Authz: only assigned `FACULTY` for that course. Mentors cannot score subject entries.

## Frontend

1. Faculty entry detail: rubric numeric inputs with live total / max.
2. Classroom components form on the course’s Classroom record tab.
3. Course gradebook: per student, per required record type — raw average, formula text, normalized marks, weight %.
4. “Ask AI to draft scores” button → pending state from Valkey progress → suggested values in inputs (not auto-saved).
5. Override modal: required reason. Student grade view shows “Faculty override: {reason}”.
6. Student dashboard: same raw / formula / normalized numbers as Faculty (single compute path).

## Acceptance

- Two Applied experiments scored 40/50 and 50/50 → raw avg 45 → normalized **18 / 20**.
- One Workshop task 80/100 → normalized **24 / 30**.
- Classroom composites 2+2+3+3 = 10 with default split.
- AI enqueue appears in worker logs; faculty can apply or override; student sees reason.
- Mentor login cannot submit scores.
- Formula text visible on Faculty and Student views.
- `npm run build` succeeds.

Stop after this.
