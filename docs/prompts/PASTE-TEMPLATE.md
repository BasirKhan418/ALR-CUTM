# Paste template (every milestone)

```
You are implementing the next ALR milestone in this repo.

Problem:
We are building the CUTM ALR Digitisation Platform, not a generic LMS.
The platform must preserve the official Learning Record workflow:
- 12 subject configurations, including multi-record subjects.
- Visible score normalization into Framework marks.
- Project / Internship / Thesis deliverables with Word + PDF and sign-off.
- Subject-wise, year-wise, and program-wise workflows.
- 1 ALR credit per academic year in the Compulsory Basket.

Read first:
- @docs/alr-domain.md
- @docs/architecture.md
- @docs/prompting-architecture.md
- @docs/BUILD-TRACKER.md
- @docs/prompts/CHECKLIST.md
- @docs/prompts/MXX-....md   ← the milestone file

Stack is non-negotiable: Next.js 16 App Router + Cache Components (SSR/CDN),
MongoDB, Valkey, BullMQ. Mutations = Server Actions. proxy.ts ≠ authz.
Read node_modules/next/dist/docs/ when unsure — this is not classic Next 13.

Implement that milestone only.
Do not skip acceptance checks.
Do not invent a single Theory-shaped LR form.
Do not hide normalization math.
Do not treat program-wise evaluation as a transcript.
Do not generate unnecessary code, broad tests, mock dashboards, or unused abstractions.
Add packages only when this milestone uses them immediately.
Add env vars only when code reads them, and update .env.example in the same milestone.
Add tests only when the milestone asks for them or when pure domain logic needs protection.

Before coding:
1. Summarize the milestone in 5 bullets.
2. List exactly what is in scope.
3. List exactly what is out of scope.
4. List the files/folders you expect to touch.
5. Then implement.

During coding:
- Keep models minimal but compatible with @docs/alr-domain.md.
- Put domain rules in lib/domain/*.
- Put auth/session checks inside every Server Action.
- Keep private data dynamic; do not use "use cache" for sessions, scores, dashboards, sign-offs, cases, or analytics.
- Use BullMQ for long jobs and Valkey only for sessions, hashed OTPs, OAuth state, locks, rate limits, job progress, and token TTL mirrors.
- Auth is email + OTP and Sign in with Google only. Do not add Better Auth, passwords, or TOTP.
- Reuse the M00 theme tokens and BrandMark. Do not invent a new palette or font.

When done:
1. Update @docs/BUILD-TRACKER.md.
2. List files changed.
3. Show the acceptance checklist with [x] / [ ].
4. Show the relevant items from @docs/prompts/CHECKLIST.md.
5. List commands run and important output.
6. If a command was not run, say why.
7. State the next milestone.
```
