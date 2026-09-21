# ALR Architecture

Greenfield on this repo. Next.js 16 has breaking APIs vs training data — read `node_modules/next/dist/docs/` before inventing patterns. **Middleware is `proxy.ts`.** Enable **Cache Components**.

## Product Problem

The platform digitizes the official CUTM Learning Record process. The main technical challenge is not CRUD; it is preserving the university workflow:

- A course can require more than one record type at the same time.
- Per-entry marks do not always equal Framework marks and must be normalized visibly.
- Major deliverables are not session logs; they are one report record with Word + PDF, plagiarism, CO sheet, and e-sign.
- Year-wise and program-wise evaluations are committee workflows that feed credits and the exam cell.

Architecture decisions must protect those rules. If a shortcut breaks them, do not take it.

## Principles

1. Next.js is the BFF. No separate Nest/Express app.
2. Server Components read. Server Actions write. Route Handlers only for non-HTML HTTP (files, tokens, webhooks, binary exports).
3. Cache the **catalog and public shells** for CDN. Never `"use cache"` on per-student marks, sessions, or sign-off queues.
4. MongoDB is source of truth. Valkey is ephemeral. BullMQ is the only long-running side-effect runner.
5. Domain rules live in `lib/domain/*` as pure functions. UI and jobs call those functions. Do not hide normalization in a random aggregator.
6. Add only the code needed for the current milestone. No speculative routes, models, dashboards, tests, or packages.

## Repo layout (create in M00, fill across milestones)

```
app/
  (public)/                 # login, industry token pages
  (app)/                    # authenticated shell
    student/
    faculty/
    mentor/
    supervisor/
    hod/
    dean/
    admin/
  api/
    files/[fileId]/route.ts
    industry/[token]/route.ts
    auth/google/route.ts
    auth/google/callback/route.ts
    exports/exam-cell/route.ts
    webhooks/plagiarism/route.ts
    health/route.ts
  layout.tsx
  globals.css
proxy.ts
instrumentation.ts          # start worker in node runtime if appropriate; prefer `npm run worker`
lib/
  db/mongo.ts
  db/models/
  valkey.ts
  queue/queues.ts
  queue/jobs.ts
  auth/
  domain/                   # subject-map, weights, normalize, signoff machines
  services/
  validations/
components/
  ui/                       # shadcn
  forms/
  records/
  signoff/
  analytics/
workers/
  index.ts
  processors/
docker-compose.yml
```

## Next.js 16 (SSR + CDN)

```ts
// next.config.ts
const nextConfig = {
  cacheComponents: true,
}
```

| Concern | Pattern |
| --- | --- |
| Public / login chrome | `"use cache"` + `cacheLife('hours')` |
| Course catalog lists for faculty setup | `"use cache"` + `cacheTag('catalog', campusId)` , `updateTag` on admin save |
| Student dashboard, queues, marks | Dynamic RSC, no cache directive |
| Session | Read in Server Components / Actions; follow `authentication-with-cache-components` |
| Mutations | `"use server"` + authz inside every action + `updateTag` / `revalidatePath` |
| Gate | `proxy.ts` cookie presence redirect only — not real authz |
| Loading | `loading.tsx` skeletons on every authenticated segment |

Auth is **hand-rolled** in `lib/auth/`. **No Better Auth, Auth.js, Clerk, or passwords.**

Two sign-in methods only:

1. **Email + OTP** — Server Actions `requestOtp` / `verifyOtp`. Hashed OTP in Valkey `otp:{email}`. Mail via BullMQ `notify` (`auth.otp`). If SMTP is unset, worker logs the code (dev).
2. **Sign in with Google** — Route Handlers `/api/auth/google` and `/api/auth/google/callback`. Match Google email to an **already provisioned** user. No auto-signup.

### Session and cookie policy (no JWT)

**Do not use JWT** for ALR login, sessions, or API auth. Do not add `jsonwebtoken`, `jose` session tokens, or access/refresh JWTs. Google may return an `id_token` (Google’s JWT). Read email/`sub` from it, then **throw it away** and create our session.

Our session is an **opaque session id**:

- Cookie name: `alr_session`
- Cookie value: random session id (signed or HMAC’d with `AUTH_SECRET` so it cannot be forged)
- Store: Valkey `sess:{sid}` holds `{ userId, roles, campusId, declarationAcceptedAt, loginMethod }`
- **Max-Age / TTL: 7 days** (`SESSION_TTL_DAYS=7`). Cookie `maxAge` and Valkey TTL stay in sync.
- Sliding refresh: on each authenticated request that is more than 1 day into the TTL, reset both cookie maxAge and Valkey TTL back to 7 days. Logout deletes both immediately.

Cookie flags:

| Flag | Value |
| --- | --- |
| `httpOnly` | `true` |
| `secure` | `true` in production; `false` on localhost |
| `sameSite` | `lax` |
| `path` | `/` |
| `maxAge` | `7 * 24 * 60 * 60` seconds |

Industry Supervisor tokens stay hashed one-time tokens, also not JWT.

## Dependency Rules

Add packages slowly. Every new dependency must be used by the same milestone.

Expected packages by milestone:

| Milestone | Package category |
| --- | --- |
| M00 | `mongoose`, `ioredis`, `bullmq`, `tsx`, optional small test runner |
| M01 | cookie signing, OTP hash (`node:crypto`), Google OAuth token exchange (`fetch`). SMTP only if env is set |
| M04 | no external AI SDK yet; use stub processor |
| M05 | file upload/storage helpers only if needed |
| M08 | one PDF library |

Do not add Better Auth, Auth.js, password libraries, TOTP libraries, chart libraries, object-storage SDKs, browser-test frameworks, or AI provider SDKs before a milestone explicitly needs them. A mail lib is allowed in M01 only if SMTP env is used; otherwise console-log the OTP from the worker.

## MongoDB

Database name: `alr`.

Use the official `mongodb` driver **or** Mongoose — pick **Mongoose** for typed schemas and keep one connection via `lib/db/mongo.ts` (cached on `globalThis` in dev).

### Collections

| Collection | Purpose |
| --- | --- |
| `campuses` | Six CUTM campuses |
| `departments` | Campus-scoped |
| `programmes` | Degree + durationYears (drives expected ALR credits) |
| `users` | Identity + role bindings |
| `declarations` | First-login e-declaration |
| `courses` | Subject + `combinationCode` + derived record types + weights |
| `enrollments` | Student ↔ course ↔ term |
| `faculty_assignments` | Faculty/Mentor/Supervisor bindings |
| `lr_entries` | Classroom / Applied / Action **entries** |
| `major_deliverables` | Project / Internship / Thesis |
| `paper_publications` | PG thesis gate |
| `signoffs` | Every sequential e-sign step |
| `subject_scores` | Normalized subject-wise contributions |
| `year_evaluations` | Year-wise committee records |
| `program_evaluations` | Program-wise committee records |
| `credit_ledger` | 1 credit/year Compulsory Basket posts |
| `files` | Word/PDF/certificate metadata (bytes in S3/MinIO or GridFS) |
| `plagiarism_reports` | Scores, tool, threshold, exclusions |
| `plagiarism_cases` | Committee case file |
| `ai_score_runs` | AI result + faculty override |
| `audit_logs` | Immutable-ish trail |
| `settings` | Thresholds, formula ids, archival policy |
| `industry_tokens` | Hashed tokens for no-login internship forms |

### Index starters

- `users`: unique `email`, unique `registrationNo` (sparse), unique `googleSub` (sparse), `{ campusId, roles }`
- `courses`: `{ campusId, termId, combinationCode }`, `{ code, termId }` unique
- `enrollments`: unique `{ studentId, courseId, termId }`
- `lr_entries`: `{ courseId, studentId, recordType, createdAt }`
- `major_deliverables`: `{ candidateIds }`, `{ supervisorId, status }`
- `signoffs`: `{ targetType, targetId, stepOrder }`
- `plagiarism_cases`: `{ studentId, status }`, `{ responseDueAt }`
- `credit_ledger`: unique `{ studentId, academicYear, source: 'ALR_YEAR' }`

## Valkey

Client: `ioredis` against Valkey. One connection for cache/sessions, **separate** connection for BullMQ (required).

| Key | TTL | Use |
| --- | --- | --- |
| `sess:{sid}` | 7 days (aligned with cookie) | Opaque session payload |
| `otp:{email}` | `OTP_TTL_SECONDS` (600) | Hashed email OTP |
| `otp:attempts:{email}` | 15m | OTP verify failures |
| `rl:otp:{email}` | 15m | OTP request throttle |
| `rl:auth:{ip}` | 15m | Login / OTP throttle |
| `oauth:state:{state}` | 10m | Google OAuth CSRF state |
| `token:industry:{hash}` | 14d | Industry form |
| `lock:signoff:{targetId}` | 30s | Prevent double-approve |
| `job:progress:{jobId}` | 1h | UI poll |

Do not store marks or records in Valkey except short-lived job progress.

## BullMQ queues

Worker process: `tsx workers/index.ts` via `npm run worker`. Concurrency per queue. All processors **idempotent**.

| Queue | Jobs | Notes |
| --- | --- | --- |
| `scoring` | `ai.score.entry` | Stub provider in M04, swap later |
| `plagiarism` | `plagiarism.prose` | Rate-limited; retry with backoff |
| `code-similarity` | `plagiarism.code` | Programming Practice only |
| `exports` | `export.booklet`, `export.exam-cell` | PDF / CSV-JSON |
| `notify` | `notify.email`, `auth.otp` | OTP, sign-off, case window, return |
| `maintenance` | `plagiarism.case.timeout` | Repeatable |

Failed jobs go to BullMQ fail set; Admin health reads queue counts + Valkey `rl:plagiarism:*`.

## Files

M00: local disk or MinIO. Metadata in `files`. Major deliverables reject if either `.docx` or `.pdf` is missing. Programming uploads are `.zip` / source and route to `code-similarity`.

## AuthZ

Every Server Action:

1. `requireSession()`
2. `requireRole(...)` or resource ACL (campus + department + assignment)
3. Write `audit_logs`

Industry token routes authenticate the **token**, not a user session.

## UI conventions

- shadcn already in repo (`base-nova`, Tailwind 4). Reuse `@/components/ui`.
- Authenticated chrome: sidebar by role, campus badge, term switcher.
- Status machines as steppers (`signoffs` as source of truth).
- Show formula + raw + normalized everywhere scores appear.
- Empty / error / forbidden states on every list.
- Desktop first; tables must not overflow without a scroll container.

## Env

M00 must create `.env.example` with local defaults:

```bash
MONGODB_URI=mongodb://localhost:27017/alr
VALKEY_URL=redis://localhost:6379
FILE_DIR=./.data/files
APP_URL=http://localhost:3000
```

M01 adds:

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

Later optional:

```bash
PLAGIARISM_PROVIDER=stub
PLAGIARISM_HOURLY_CAP=100
EXPORT_SIGNING_SECRET=
```

Rules:

- Never commit `.env.local`.
- Add an env var only when code uses it.
- Update `.env.example` in the same milestone.
- Read env through a typed config helper such as `lib/config/env.ts`.
- Fail loudly for required infrastructure vars (`MONGODB_URI`, `VALKEY_URL`; `AUTH_SECRET` after M01).
- Soft-default Google and SMTP to unused; OTP still works via worker console log.

## Test Rules

Do not generate tests for everything.

Add tests when:

- A milestone explicitly requests them.
- The code is pure domain logic with academic consequence, such as normalization, cumulation, or sign-off state transitions.
- A bug is fixed and a small regression test prevents it returning.

Avoid tests when:

- The feature is mostly UI wiring.
- The test would require heavy browser automation before the app is stable.
- The test only snapshots generated layout.

Preferred early tests:

- `normalizeContribution`.
- Subject-code to required-record mapping.
- Credit ledger uniqueness.
- Sign-off next-step logic.

## Milestone Handoff Rules

Every implementation milestone must update `docs/BUILD-TRACKER.md`:

- Milestone status.
- Main behavior shipped.
- Commands run.
- Known gaps or decisions.
- Domain coverage checklist items moved from `Planned` to `Implemented`.

If the tracker is not updated, the milestone is not complete.
