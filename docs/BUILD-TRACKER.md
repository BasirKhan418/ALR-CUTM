# ALR Build Tracker

Update this file at the end of every milestone implementation. It is the handoff document for vibe-coding sessions.

## Current State

Status: `M06 shipped`

M00–M06 are in the tree. Sign-in is email + OTP and optional Google. Sessions are opaque `alr_session` cookies in Valkey (7 days). Courses use the 12-way combination map. Students file Classroom, Applied, and Workshop entries, plus one shared Major Deliverable per Project / Internship / PG Thesis (Word + PDF, sequential sign-off). Assigned faculty score Applied/Workshop rubrics and Classroom composites. Subject contributions are always normalized — never a raw average. Internship totals come from internal/50 + external/50, each half of 30. PG Thesis evaluation is gated on an approved Paper Publication Report. Integrity uses per-document thresholds (Thesis 20, Project 30), supervisor-certified exclusions, a real case workflow, and a separate code-similarity queue for Programming Practice.

## What We Are Building

ALR is a Next.js 16 digital Learning Record platform for Centurion University. It replaces and extends the paper LR booklet process with:

- Course setup using the Framework's subject-to-record mapping.
- Student Learning Record submissions for Classroom, Applied, Action, Project, Thesis, and Internship records.
- Faculty scoring with visible normalization into Framework marks.
- Major deliverables with Word + PDF, plagiarism report, CO sheet, and sequential sign-off.
- Year-wise and program-wise committee evaluation.
- 1 ALR credit per academic year in the Compulsory Basket.
- Exam-cell export, campus analytics, booklet-style PDF exports, and audit trails.

## Non-Negotiables

- Stack: Next.js 16, MongoDB, Valkey, BullMQ.
- No separate backend server.
- No one-size-fits-all Theory form.
- No hidden normalization math.
- No fake transcript-only program-wise workflow.
- No unnecessary generated tests or broad boilerplate.
- No private student data in cached components.
- Auth is email + OTP and Sign in with Google only. No Better Auth, no passwords, no TOTP.

## Milestone Status

| Milestone | Status | Shipped | Notes |
| --- | --- | --- | --- |
| M00 Foundation | Done | Docker compose, domain constants, Mongo/Valkey/BullMQ, role shells, CUTM theme + logo | Health and worker ping |
| M01 Identity/Auth | Done | Email OTP + Google, Valkey sessions (7d), declaration, admin provision, multi-role cookie/`?role=` switcher | Google is find-only; OTP auto-creates allowed CUTM emails per TESTING.md |
| M02 Catalog/Mapping | Done | 12-way combination setup, derived record configs, MOOC delivery, enroll, Faculty vs Mentor, classroom split, student my-courses, admin terms + campus filter | Students cannot submit yet |
| M03 LR Submissions | Done | Per-record Submit LR tabs, draft/submit, books/manuals, workshop hours sum, faculty inbox, Project/Thesis/Internship now open as M05 deliverables | Word/PDF lives on the deliverable |
| M04 Evaluation/Scoring | Done | Applied 50-pt rubric, Workshop 100-pt rubric, Classroom composites, SubjectScore via recompute only, stub AI queue + Valkey progress, override reason on student view, faculty gradebook | Mentors cannot score |
| M05 Major Deliverables | Done | One MajorDeliverable per Project/Internship/Thesis, ≤3 candidates, Word+PDF required, sequential Signoff + lock, industry token (Mongo+Valkey 14d), internship 40+40=24, PG Thesis publication gate, supervisor/HoD/Dean queues | Plagiarism detector is M06 |
| M06 Plagiarism/Integrity | Done | Per-type thresholds (Thesis 20), stub prose/code providers, exclusions with certificate, OPEN→…→RATIFIED/DISMISSED cases, UNDER_COMMITTEE_REVIEW, programming zip on `plagiarism.code`, hourly cap + health % | Do not start M07 |
| M07 Year/Program/Credits | Not started | - | Requires scores/sign-offs |
| M08 Analytics/Exports | Not started | - | Requires M07 data |
| M09 Polish/Hardening | Not started | - | Final cleanup |

Use only these status values:

- `Not started`
- `In progress`
- `Blocked`
- `Done`

## Environment Checklist

M00 + M01 `.env.example`:

```bash
MONGODB_URI=mongodb://localhost:27017/alr
VALKEY_URL=redis://localhost:6379
FILE_DIR=./.data/files
APP_URL=http://localhost:3000
AUTH_SECRET=replace-with-local-secret
SESSION_TTL_DAYS=7
OTP_TTL_SECONDS=600
OTP_DEV_LOG=true
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=alr@localhost
```

Later:

```bash
PLAGIARISM_PROVIDER=stub
PLAGIARISM_HOURLY_CAP=100
EXPORT_SIGNING_SECRET=
```

Rules:

- Add an env var only when code uses it.
- Add every env var to `.env.example`.
- Never commit `.env.local`.
- Prefer typed config helpers over reading `process.env` everywhere.

## Command Checklist

```bash
npm run lint
npm run build
npm run dev
npm run worker
npm run seed:m00
npm run seed:m01
npm run seed:m02
npm run seed:m03
npm run seed:m04
npm run seed:m05
npm run seed:m06
```

M06 commands run:

- `npm run lint` — pass
- `npm run build` — pass
- `npm test` — pass (normalize + scoring + internship + plagiarism)
- `npm run seed:m06` — pass (Thesis 20, project 35% exclusion demo, internship case, code job, 78/100 usage)

Restart `npm run dev` and `npm run worker` after pulling M01 so `AUTH_SECRET` and the notify worker load.

Local test steps (what to run, where OTP prints, seed emails, domain rules): [`docs/TESTING.md`](TESTING.md).

## Domain Coverage Checklist

| Item | Status | Milestone |
| --- | --- | --- |
| 12-way subject mapping | Implemented | M02 |
| MOOC course type | Implemented | M02 |
| Multi-record subject submission | Implemented | M03 |
| Normalization formula visible in UI | Implemented | M02, M04 |
| Classroom 4 components | Implemented | M04 |
| Workshop hours logging | Implemented | M03 |
| Books/Manuals Referred | Implemented | M03 |
| Faculty override reason visible to student | Implemented | M04 |
| Major deliverable one-record model | Implemented | M05 |
| Multi-candidate deliverables | Implemented | M05 |
| Word + PDF both retained | Implemented | M05 |
| Internship industry token path | Implemented | M05 |
| Internship internal/external 50/50 total | Implemented | M05 |
| PG Thesis publication gate | Implemented | M05 |
| Per-document plagiarism thresholds | Implemented | M06 |
| Thesis 20% threshold | Implemented | M06 |
| Supervisor-certified exclusions | Implemented | M06 |
| Plagiarism case management | Implemented | M06 |
| Code-similarity separate from prose | Implemented | M06 |
| Year-wise committee workflow | Planned | M07 |
| Program-wise committee workflow | Planned | M07 |
| 1 credit/year ledger | Planned | M07 |
| Exam-cell export | Planned | M07 |
| Mentor PO/PSO role | Implemented | M02, M07 |
| Six-campus analytics | Planned | M08 |
| Booklet-style PDF export | Planned | M08 |
| Archival policy explicit | Planned | M09 |
| One-time declaration only | Implemented | M01, M09 |
| Email + OTP sign-in | Implemented | M01 |
| Sign in with Google (provisioned emails only) | Implemented | M01 |
| Plagiarism headroom health | Implemented | M06, M09 |

## Last Completed Milestone

M06 Plagiarism/Integrity

## Known Gaps / Decisions

- The compiled report says there are twelve subject configurations but lists seven singles plus four named combinations. We treat `THEORY_WORKSHOP` as the fifth combination until the Dean office confirms otherwise. Keep it data-driven.
- Real plagiarism provider is not selected. Use the `SimilarityProvider` interface plus hashed-shingle stubs (`STUB_PROSE` / `STUB_CODE`). Do not add a Turnitin client.
- Programming Practice is one zip on Applied courses and always uses job `plagiarism.code` on the code-similarity queue.
- Opening a case sets the deliverable to `UNDER_COMMITTEE_REVIEW` and restores `statusBeforeCase` on ratify or dismiss.
- Hourly cap is Valkey `rl:plagiarism:{campus}:{hour}` vs `settings.plagiarismHourlyCap` (seed 100). Health shows usage %; seed writes 78.
- Real LMS integration for Classroom components is not selected. Use manual entry first.
- Real academic ERP integration is not selected. Use exam-cell export first.
- File storage starts local under `FILE_DIR`; S3/MinIO can be added later only when needed.
- Auth is email + OTP and Google only. Local OTP uses worker/Next console log until SMTP is set. Google needs real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` to enable the button.
- Sign-in accepts `@cutm.ac.in`, `@cutm.edu.in`, dummy admin `khanbasir5555@gmail.com`, and OTP Gmail `khanbasir5556@gmail.com`. Seed dummy users skip OTP and enter directly until invitation-based OTP ships. Other Gmail addresses are rejected.
- SMTP send is a small STARTTLS helper; if it fails, fix env or leave SMTP unset and use console OTP.
- Workshop hours certificate is JSON on the student course header. PDF export is M08.
- Draft save is server-validated only on Submit, so incomplete drafts can be stored.
- Changing a combination drops leftover **draft** entries of removed record types. Submitted rows stay for the faculty inbox.
- Classroom 2+2+3+3 needs the course split set to 2/2/3/3. Default campus split stays 2.5 each. `seed:m04` writes that split on `ALR-THEORY-PRACTICE-PROJECT`.
- AI scoring is a deterministic midpoint stub on the BullMQ `scoring` queue. Suggestions fill inputs only; they are not saved until faculty confirm. Override reason is required when saved marks differ from the latest DONE draft.

## How To Update This Tracker

At the end of a milestone:

1. Change milestone status to `Done`.
2. Fill the `Shipped` cell with the main behavior, not every file changed.
3. Move `Last Completed Milestone`.
4. Add commands that passed.
5. Add any blocker or deferred decision under Known Gaps.
6. Update the Domain Coverage Checklist from `Planned` to `Implemented` for completed items.
