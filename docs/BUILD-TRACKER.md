# ALR Build Tracker

Update this file at the end of every milestone implementation. It is the handoff document for vibe-coding sessions.

## Current State

Status: `M01 shipped`

M00 foundation and M01 identity/auth are in the tree. Sign-in is email + OTP and optional Google. Sessions are opaque `alr_session` cookies in Valkey (7 days). No JWT, no passwords, no Better Auth.

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
| M01 Identity/Auth | Done | Email OTP + Google, Valkey sessions (7d), declaration, admin provision | No JWT / passwords |
| M02 Catalog/Mapping | Not started | - | Requires M01 |
| M03 LR Submissions | Not started | - | Requires M02 |
| M04 Evaluation/Scoring | Not started | - | Requires M03 |
| M05 Major Deliverables | Not started | - | Requires M04 basics and auth |
| M06 Plagiarism/Integrity | Not started | - | Requires M05 files/deliverables |
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
```

M01 commands run:

- `npm run lint` — pass
- `npm run build` — pass (landing cached; dashboards PPR; Google/health dynamic)
- `npm run seed:m01` — pass (Atlas)

Restart `npm run dev` and `npm run worker` after pulling M01 so `AUTH_SECRET` and the notify worker load.

Local test steps (what to run, where OTP prints, seed emails, domain rules): [`docs/TESTING.md`](TESTING.md).

## Domain Coverage Checklist

| Item | Status | Milestone |
| --- | --- | --- |
| 12-way subject mapping | Planned | M02 |
| MOOC course type | Planned | M02 |
| Multi-record subject submission | Planned | M03 |
| Normalization formula visible in UI | Planned | M02, M04 |
| Classroom 4 components | Planned | M04 |
| Workshop hours logging | Planned | M03 |
| Books/Manuals Referred | Planned | M03 |
| Faculty override reason visible to student | Planned | M04 |
| Major deliverable one-record model | Planned | M05 |
| Multi-candidate deliverables | Planned | M05 |
| Word + PDF both retained | Planned | M05 |
| Internship industry token path | Planned | M05 |
| Internship internal/external 50/50 total | Planned | M05 |
| PG Thesis publication gate | Planned | M05 |
| Per-document plagiarism thresholds | Planned | M06 |
| Thesis 20% threshold | Planned | M06 |
| Supervisor-certified exclusions | Planned | M06 |
| Plagiarism case management | Planned | M06 |
| Code-similarity separate from prose | Planned | M06 |
| Year-wise committee workflow | Planned | M07 |
| Program-wise committee workflow | Planned | M07 |
| 1 credit/year ledger | Planned | M07 |
| Exam-cell export | Planned | M07 |
| Mentor PO/PSO role | Planned | M02, M07 |
| Six-campus analytics | Planned | M08 |
| Booklet-style PDF export | Planned | M08 |
| Archival policy explicit | Planned | M09 |
| One-time declaration only | Implemented | M01, M09 |
| Email + OTP sign-in | Implemented | M01 |
| Sign in with Google (provisioned emails only) | Implemented | M01 |
| Plagiarism headroom health | Planned | M06, M09 |

## Last Completed Milestone

M01 Identity/Auth

## Known Gaps / Decisions

- The compiled report says there are twelve subject configurations but lists seven singles plus four named combinations. We treat `THEORY_WORKSHOP` as the fifth combination until the Dean office confirms otherwise. Keep it data-driven.
- Real plagiarism provider is not selected. Use provider interface plus local stub first.
- Real LMS integration for Classroom components is not selected. Use manual entry first.
- Real academic ERP integration is not selected. Use exam-cell export first.
- File storage starts local under `FILE_DIR`; S3/MinIO can be added later only when needed.
- Auth is email + OTP and Google only. Local OTP uses worker/Next console log until SMTP is set. Google needs real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` to enable the button.
- Sign-in accepts `@cutm.ac.in`, `@cutm.edu.in`, dummy admin `khanbasir5555@gmail.com`, and OTP Gmail `khanbasir5556@gmail.com`. Seed dummy users skip OTP and enter directly until invitation-based OTP ships. Other Gmail addresses are rejected.
- SMTP send is a small STARTTLS helper; if it fails, fix env or leave SMTP unset and use console OTP.

## How To Update This Tracker

At the end of a milestone:

1. Change milestone status to `Done`.
2. Fill the `Shipped` cell with the main behavior, not every file changed.
3. Move `Last Completed Milestone`.
4. Add commands that passed.
5. Add any blocker or deferred decision under Known Gaps.
6. Update the Domain Coverage Checklist from `Planned` to `Implemented` for completed items.
