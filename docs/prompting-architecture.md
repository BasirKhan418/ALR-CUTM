# ALR Prompting Architecture

Use this document before starting any milestone. It explains what we are building, how the prompts are structured, what context to attach, and how to stop agents from generating unnecessary code.

## Problem Statement

Centurion University currently depends on paper Learning Record booklets and a partial digital platform. The compiled review shows the digital platform must not be a simple upload or single Theory-form app. It must digitize the full ALR process:

- 12 subject configurations, including MOOC and multi-record subjects.
- Multiple record types per subject when the Framework requires them.
- Subject-wise, year-wise, and program-wise evaluation workflows.
- Real ALR academic credit: 1 credit per year in the Compulsory Basket.
- Major deliverables for Project, Internship, and Thesis with Word + PDF, plagiarism report, CO sheet, and sign-off.
- Sequential e-sign chains, committee review, plagiarism case management, and exam-cell export.

The build target is a practical college-grade system that can be coded milestone by milestone without re-reading the whole compiled report every time.

## Build Philosophy

Build only what the current milestone needs. Each prompt should produce a small vertical slice that is runnable, reviewable, and easy to continue.

Do:

- Read `docs/alr-domain.md`, `docs/architecture.md`, and the current milestone prompt first.
- Keep domain rules in `lib/domain/*`.
- Keep database models minimal but future-compatible with the domain bible.
- Use existing Next.js, Tailwind, and shadcn patterns in this repo.
- Prefer Server Actions for mutations and Route Handlers only for public HTTP, files, tokens, exports, and webhooks.
- Add seeds only when needed for the current milestone acceptance checks.
- Add tests only when the milestone explicitly requests tests, or when a pure domain function has important math or state-machine rules.

Do not:

- Generate broad test suites just to look complete.
- Add mock pages, demo dashboards, chart libraries, or fake workflows outside the milestone.
- Add unused packages, unused helper layers, or “future” abstractions.
- Create a separate backend server. Next.js is the backend-for-frontend.
- Hide score normalization in UI components or random service files.
- Treat program-wise evaluation as a read-only transcript.
- Use one fixed Theory-shaped LR form.
- Cache private student data, marks, sign-off queues, or session-specific pages.

## Context Pack For Every Agent Chat

Attach these files in every milestone chat:

- `@docs/alr-domain.md`
- `@docs/architecture.md`
- `@docs/BUILD-TRACKER.md`
- `@docs/prompts/MXX-...md`

Attach the compiled report only when the agent needs to verify product meaning:

- `@docs/ALR Compiled Report.docx`

Use `docs/prompts/PASTE-TEMPLATE.md` as the message wrapper.

## Prompt Shape

Every milestone prompt follows this shape:

1. **Milestone name**: one exact milestone only.
2. **Problem statement**: what user/product gap this milestone solves.
3. **Current build state**: what previous milestones should already have shipped.
4. **Scope**: what to implement now.
5. **Out of scope**: what not to implement, even if related.
6. **Architecture rules**: Next.js, MongoDB, Valkey, BullMQ, cache rules.
7. **Backend tasks**: models, actions, queues, authz, audit.
8. **Frontend tasks**: pages, states, forms, role views.
9. **DB / env / seed tasks**: collections, indexes, environment variables, seed data.
10. **Acceptance checklist**: concrete checks that prove the milestone is done.
11. **Tracker update**: update `docs/BUILD-TRACKER.md` with shipped status, commands run, and known gaps.

## Required Stack

- Next.js 16 App Router
- React 19
- Tailwind 4
- shadcn `base-nova`
- MongoDB
- Valkey
- BullMQ
- Mongoose unless a milestone explicitly decides otherwise
- Hand-rolled auth: **email + OTP** and **Sign in with Google** only. No Better Auth, no passwords, no TOTP

## Environment Variables

Use `.env.example` to document all variables. Never commit `.env.local`.

Base environment:

```bash
MONGODB_URI=mongodb://localhost:27017/alr
VALKEY_URL=redis://localhost:6379
FILE_DIR=./.data/files
APP_URL=http://localhost:3000
```

M01 adds auth env (no Better Auth):

```bash
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

Later milestones may add variables only when they are actually used:

```bash
PLAGIARISM_PROVIDER=stub
PLAGIARISM_HOURLY_CAP=100
EXPORT_SIGNING_SECRET=
```

If a variable is added, the same milestone must:

- Add it to `.env.example`.
- Read it through one typed config helper.
- Explain what happens when it is missing.

## SSR / CDN Rules

Use Cache Components carefully:

- Public landing and public chrome can use `"use cache"` with `cacheLife`.
- Catalog read models can use `"use cache"` plus `cacheTag`, then `updateTag` on writes.
- Health, dashboards, student records, scores, sessions, sign-offs, queues, cases, and analytics are dynamic.
- Never call session helpers inside cached functions or cached components.

## Database Rules

MongoDB is the source of truth. Valkey is not.

MongoDB stores:

- users, courses, enrollments, submissions, scores, sign-offs, files, cases, credits, settings, audit logs.

Valkey stores:

- sessions, hashed OTPs, OAuth state, short-lived locks, rate limits, job progress, token TTL mirrors.

BullMQ handles:

- AI scoring, plagiarism, code similarity, exports, notifications, maintenance jobs.

## Minimal Code Rule

When coding from these prompts, the agent must use this decision rule:

> If a file, package, route, model field, or test does not directly satisfy the milestone acceptance checklist or protect an important domain invariant, do not add it.

Useful examples:

- Good: unit test `normalizeContribution` because ALR marks depend on it.
- Good: seed one `THEORY_PRACTICE_PROJECT` course because M03 needs a multi-record subject.
- Bad: create Cypress tests before user asks for browser automation.
- Bad: add charts in M02 when a table preview is enough.
- Bad: add SMS, email templates, or upload-to-S3 adapters before the milestone needs them.

## Milestone Completion Format

At the end of every implementation chat, require the agent to report:

```md
## What Shipped
- ...

## Acceptance Checklist
- [x] ...
- [ ] ... because ...

## Commands Run
- `npm run build`
- ...

## Tracker Update
- Updated `docs/BUILD-TRACKER.md`: MXX status, date, commands, known gaps.

## Next Milestone
- MXX+1: ...
```

If a command was not run, the agent must say why.

