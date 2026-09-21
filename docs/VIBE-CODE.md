# ALR Digitisation Platform — Vibe-Code Playbook

This is the main entry point for vibe-coding the ALR platform. Paste **one milestone prompt** per agent chat and keep each milestone small, runnable, and reviewable.

## What We Are Building

ALR is a Next.js 16 digital Learning Record platform for Centurion University. It digitizes the paper LR booklet process and the official Learning Record Framework:

- 12 subject configurations, including MOOC and combination subjects.
- Student submissions for Classroom, Applied, Action, Project, Thesis, and Internship records.
- Faculty scoring with visible Framework normalization.
- Major deliverables with Word + PDF, plagiarism report, CO sheet, and sequential sign-off.
- Year-wise and program-wise committee evaluation.
- 1 ALR credit per academic year in the Compulsory Basket.
- Exam-cell export, campus analytics, booklet-style PDF, and audit trails.

Do not build a generic LMS. Do not build one fixed Theory form. Build the ALR workflow described in the docs.

## Source Files

Attach these files every time:

- `@docs/alr-domain.md`
- `@docs/architecture.md`
- `@docs/BUILD-TRACKER.md`

Read this file when preparing a prompt:

- `@docs/prompting-architecture.md`
- `@docs/prompts/CHECKLIST.md`

Do not skip ahead. Each milestone assumes the previous one is merged and runnable.

| Order | File | Ships |
| --- | --- | --- |
| 0 | [`prompts/M00-foundation.md`](prompts/M00-foundation.md) | Next.js 16 Cache Components, Docker (Mongo + Valkey), BullMQ worker, folders, seed campuses |
| 1 | [`prompts/M01-identity-auth.md`](prompts/M01-identity-auth.md) | Roles, campuses, **email+OTP + Google** sign-in, Valkey sessions, first-login e-declaration |
| 2 | [`prompts/M02-catalog-mapping.md`](prompts/M02-catalog-mapping.md) | 12-way subject mapping, MOOC, weights, **visible** normalization formula |
| 3 | [`prompts/M03-lr-submissions.md`](prompts/M03-lr-submissions.md) | Per-subject multi-record Submit LR, books/manuals, workshop hours |
| 4 | [`prompts/M04-evaluation-scoring.md`](prompts/M04-evaluation-scoring.md) | Faculty scoring, classroom 4-composites, AI job + human override |
| 5 | [`prompts/M05-major-deliverables.md`](prompts/M05-major-deliverables.md) | Project / Internship / Thesis, multi-candidate, Word+PDF, industry token |
| 6 | [`prompts/M06-plagiarism-integrity.md`](prompts/M06-plagiarism-integrity.md) | Per-type thresholds, exclusions, case management, code-similarity queue |
| 7 | [`prompts/M07-year-program-credits.md`](prompts/M07-year-program-credits.md) | Year + program committee workflows, 1 credit/year, exam-cell export |
| 8 | [`prompts/M08-analytics-exports.md`](prompts/M08-analytics-exports.md) | 6-campus analytics, booklet PDF export, plagiarism API health |
| 9 | [`prompts/M09-polish-hardening.md`](prompts/M09-polish-hardening.md) | Archival policy, rate-limit headroom, audit polish |

## How to run a milestone

1. New agent chat (do not reuse a long polluted thread).
2. Open [`prompts/PASTE-TEMPLATE.md`](prompts/PASTE-TEMPLATE.md), then paste the **entire** milestone file.
3. Attach `@docs/alr-domain.md`, `@docs/architecture.md`, `@docs/BUILD-TRACKER.md`, and [`prompts/CHECKLIST.md`](prompts/CHECKLIST.md).
4. End with: `Implement this milestone only. Stop when the acceptance checklist is green.`
5. Make the agent update [`BUILD-TRACKER.md`](BUILD-TRACKER.md).
6. Smoke-test the listed screens, then start the next milestone.

## Anti-Bloat Rules

- Add code only when it satisfies the current milestone acceptance checklist or protects a core domain invariant.
- Do not add broad test suites, mock charts, future integrations, or unused abstractions.
- Add tests only when a prompt asks for them or for important pure domain logic like normalization and state machines.
- Do not add a package unless the milestone uses it immediately.
- Keep seeds small and tied to acceptance checks.

## Compiled-review coverage

| Review item | Milestone |
| --- | --- |
| a 12-way mapping + multi-record subjects | M02, M03 |
| b MOOC course type | M02 |
| c Annual compile + 5-criterion + committee | M07, M08 |
| d Program-wise workflow (not a transcript) | M07 |
| e Per-entry → subject-weight formula | M00 domain, M02, M04 |
| f Credit ledger 1/year Compulsory Basket | M07 |
| g Major / Capstone record | M05 |
| h Sequential e-sign all tiers | M05, M07 |
| i Mentor ≠ Faculty (PO/PSO) | M02, M07 |
| j Per-type plagiarism threshold (Thesis 20%) | M06 |
| k Supervisor-certified exclusions | M06 |
| l Plagiarism case management | M06 |
| m Classroom 4 composites | M04 |
| n Code similarity (not prose) | M06 |
| o Workshop hours + certificate | M03, M08 |
| p Six-campus analytics | M08 |
| q Booklet-layout export | M08 |
| r AI override with student-visible reason | M04 |
| s Industry Supervisor token path | M05 |
| t Internship Internal 50 + External 50 | M05 |
| u PG Thesis publication gate | M05 |
| v Multi-candidate (≤3) | M05 |
| w Word + PDF both kept | M05 |
| x Archival policy explicit | M00 seed, M09 |
| y Books/Manuals Referred | M03, M09 |
| z One-time e-declaration | M01, M09 |
| aa Sign-in factor (email OTP; Google as alternate) | M01 |
| bb Plagiarism API headroom | M06, M09 |

## Stack (do not substitute)

- **App:** Next.js 16 App Router, React 19, Tailwind 4, shadcn (`base-nova`)
- **SSR + CDN:** `cacheComponents: true`, `"use cache"` + `cacheLife` / `cacheTag` for public/catalog shells only
- **DB:** MongoDB
- **Cache / sessions / locks / rate limits:** Valkey (Redis protocol)
- **Jobs:** BullMQ on Valkey
- **Mutations:** Server Actions (`"use server"`)
- **Public HTTP:** Route Handlers only (files, tokens, webhooks, exports)
- **Edge gate:** `proxy.ts` (Next.js 16 name for middleware) — optimistic redirects only
- **Auth:** email + OTP and Sign in with Google only. No Better Auth. No passwords. **No JWT sessions** — opaque `alr_session` cookie, 7 days.

## Local Environment

M00 must create `.env.example`. Local defaults:

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
```

Add future env vars only when the code actually reads them. Never commit `.env.local`.
