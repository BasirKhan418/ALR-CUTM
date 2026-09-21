# M00 — Foundation (infra + app shell)

Copy everything below the line into a new agent chat.

---

Implement **M00 Foundation** for the CUTM ALR Digitisation Platform. Read and obey `@docs/alr-domain.md` and `@docs/architecture.md`. This repo is Next.js 16 (App Router, React 19, Tailwind 4, shadcn base-nova). Training-data Next.js is wrong here — read `node_modules/next/dist/docs/` for Cache Components, `proxy.ts`, Server Actions, and Route Handlers before coding.

**This milestone only.** Do not build login, LR forms, or scoring yet.

## Goal

A runnable monorepo-style Next.js app that can talk to MongoDB + Valkey, process a BullMQ ping job, and render role-route shells (empty). CDN/SSR caching is wired.

## Backend

1. Enable `cacheComponents: true` in `next.config.ts`.
2. Add `docker-compose.yml` with `mongo:7` (port 27017) and `valkey/valkey:8` (port 6379). Persist volumes.
3. Add `.env.example` with `MONGODB_URI`, `VALKEY_URL`, `FILE_DIR`, `APP_URL`. Do **not** add Better Auth or password secrets. Auth env (`AUTH_SECRET`, Google, OTP) lands in M01.
4. `lib/db/mongo.ts` — singleton Mongoose connect, cached on `globalThis`.
5. `lib/valkey.ts` — two ioredis clients: `valkey` (app) and `valkeyQueue` (BullMQ).
6. `lib/queue/queues.ts` — declare queues: `scoring`, `plagiarism`, `code-similarity`, `exports`, `notify`, `maintenance`.
7. `workers/index.ts` + `workers/processors/ping.ts` — `maintenance` queue job `ping` that writes `{ ok: true, at }` to Valkey `job:progress:{jobId}` and a Mongo `audit_logs` doc.
8. `package.json` scripts: `worker` (tsx watch), keep `dev` / `build` / `lint`.
9. `app/api/health/route.ts` — JSON: mongo ping, valkey ping, bullmq waiting counts. Dynamic, **no** `"use cache"`.
10. `instrumentation.ts` only if Next 16 docs say it is safe; prefer the standalone worker. Do not boot BullMQ workers inside the Next request path.

## Domain (create, do not wire UI yet)

Create `lib/domain/` as the only place these live:

- `subject-map.ts` — 12 combination codes → required record types
- `weights.ts` — framework marks / percents / entry maxima
- `normalize.ts` — `normalizeContribution({ scores, entryMax, frameworkMarks })`
- `campuses.ts` — the six campus slugs + display names
- `roles.ts` — role enum
- `status.ts` — deliverable + case + evaluation status enums

Unit-test `normalize.ts` with the Applied (50→20) and Action (100→30) examples from the domain bible. Use node:test or vitest — pick one and keep it.

## Frontend

1. Replace the create-next-app marketing `app/page.tsx` with a simple public landing: product name **ALR — Learning Record**, university line, link to `/login` (login page can be a “coming in M01” placeholder).
2. Authenticated route group `app/(app)/layout.tsx` with a role-aware sidebar skeleton (Student, Faculty, Mentor, Supervisor, HoD, Dean, Admin). Hardcode a `DEV_ROLE` query or env for now so you can click around without auth.
3. Empty pages: `/student`, `/faculty`, `/mentor`, `/supervisor`, `/hod`, `/dean`, `/admin` each with a page title + one-sentence purpose from the domain bible.
4. Use existing shadcn `Button`. Add only what you need: `sidebar`, `separator`, `badge`.
5. Metadata title: `ALR | Centurion University`.
6. `loading.tsx` on `(app)`.

## DB

Mongoose models (minimal fields, used by seed + health):

- `Campus` — slug, name, active
- `AuditLog` — actorId (optional), action, payload, createdAt
- `Setting` — key/value; seed `archivalPolicy: WORKING_COPY_BESIDE_HARDBOUND`, `yearWiseUsesFiveCriterion: true`, `programWiseUsesFiveCriterion: true`

Seed script `scripts/seed-m00.ts`: upsert six campuses + default settings. `npm run seed:m00`.

## CDN / cache

Landing page may use `"use cache"` + `cacheLife('hours')`. Health route must not.

## Acceptance

- `docker compose up -d` then `npm run seed:m00` inserts 6 campuses.
- `npm run dev` — landing + seven empty role pages render.
- `GET /api/health` returns mongo=ok, valkey=ok.
- `npm run worker` + enqueue ping from a tiny `scripts/ping-queue.ts` shows the Valkey progress key and an audit log.
- `normalize` tests pass.
- `npm run build` succeeds.

Stop after this. Commit-ready, no leftover marketing template copy.
