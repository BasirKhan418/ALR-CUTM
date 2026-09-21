# ALR Milestone Checklist

Use this checklist with every milestone prompt. Do not mark a milestone done unless the relevant items are complete.

## Scope Control

- [ ] The implementation matches exactly one milestone.
- [ ] Out-of-scope features were not added.
- [ ] No broad tests, mock dashboards, unused packages, or future integrations were generated.
- [ ] New files are necessary for the acceptance checklist or a core domain invariant.
- [ ] Seeds are small and directly support acceptance checks.

## Architecture

- [ ] Next.js 16 App Router conventions are followed.
- [ ] `proxy.ts` is used only for optimistic redirects / cookie presence.
- [ ] Server Actions are used for mutations.
- [ ] Route Handlers are used only for public HTTP, files, exports, tokens, webhooks, and health.
- [ ] Long-running side effects go through BullMQ.
- [ ] MongoDB is the source of truth.
- [ ] Valkey is used only for sessions, hashed OTPs, OAuth state, rate limits, locks, token TTL mirrors, or job progress.
- [ ] Domain rules live in `lib/domain/*`.

## Cache / SSR / CDN

- [ ] Public shell or catalog pages use Cache Components only when safe.
- [ ] Student dashboards, scores, sessions, sign-offs, cases, analytics, and queues are dynamic.
- [ ] Cached data has `cacheLife` / `cacheTag` where appropriate.
- [ ] Mutations invalidate tags or paths when cached catalog data changes.

## Security / AuthZ

- [ ] Sign-in is email + OTP and/or Google only. No password fields, Better Auth, or JWT sessions.
- [ ] Session cookie `alr_session` is httpOnly, 7-day maxAge, Valkey TTL aligned; logout clears both.
- [ ] Google and OTP never auto-create users; Admin provisions first.
- [ ] Every Server Action verifies session.
- [ ] Every protected action checks role and campus/department/resource scope.
- [ ] Industry token routes authenticate hashed tokens, not user sessions.
- [ ] File downloads check ACL or a valid token.
- [ ] Passwords / secrets are not logged.
- [ ] Audit logs are written for important academic actions.

## Environment

- [ ] `.env.example` includes every env var used by this milestone.
- [ ] `.env.local` is not committed.
- [ ] Required vars fail clearly when missing.
- [ ] Optional provider vars default to local stubs.
- [ ] Env reads are centralized in a config helper once that helper exists.

## Database

- [ ] Collections/models contain only fields needed now plus required domain compatibility fields.
- [ ] Indexes from `docs/architecture.md` are added when the collection is introduced.
- [ ] Tenant/campus fields exist on campus-scoped data.
- [ ] Unique academic constraints are enforced in DB where needed.
- [ ] Seeds are idempotent upserts.

## UI

- [ ] Role-specific pages match the role’s real ALR responsibility.
- [ ] Empty, forbidden, loading, and error states exist where users can hit them.
- [ ] Tables do not overflow without scroll.
- [ ] Score views show raw score, formula, and normalized contribution.
- [ ] Sign-off views show sequential steps and timestamps.

## Domain Critical Checks

- [ ] No one fixed Theory-only LR form.
- [ ] Combination subjects show every required record type.
- [ ] MOOC maps to Classroom Learning but remains selectable as MOOC.
- [ ] Applied scores scale from 50 to 20.
- [ ] Workshop scores scale from 100 to 30 and log hours.
- [ ] Major deliverables require Word and PDF.
- [ ] Program-wise evaluation is a workflow, not a transcript.
- [ ] Credit ledger posts 1 ALR credit per academic year.
- [ ] Plagiarism threshold is per document type; Thesis default is 20%.

## Verification

- [ ] `npm run build` was run or the reason it was not run is documented.
- [ ] `npm run lint` was run when code changed or the reason is documented.
- [ ] Docker/worker/seed commands were run when the milestone depends on them.
- [ ] Acceptance checklist in the milestone file is copied into the final answer with status.
- [ ] `docs/BUILD-TRACKER.md` is updated.

