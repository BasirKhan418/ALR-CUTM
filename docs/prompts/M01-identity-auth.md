# M01 — Identity, org, email+OTP + Google sign-in

Copy everything below the line into a new agent chat.

---

Implement **M01 Identity & Auth** for ALR. Read `@docs/alr-domain.md` `@docs/architecture.md` `@docs/prompting-architecture.md` `@docs/BUILD-TRACKER.md` `@docs/prompts/CHECKLIST.md`. M00 is already in the tree (Mongo, Valkey, BullMQ, domain constants, role shells). Next.js 16: Server Actions for OTP request/verify and logout; Route Handlers only for the Google OAuth start/callback; `proxy.ts` for optimistic cookie redirects only. Cache Components on — **do not** `"use cache"` anything that reads the session.

**This milestone only.** No course catalog, no LR forms.

## Problem

University staff and students need to sign in without passwords. The only sign-in methods are:

1. **Email + OTP**
2. **Sign in with Google**

There is **no Better Auth**, **no Auth.js**, **no password**, **no TOTP MFA**. Public self-signup is not allowed. Admin provisions the user first. Google and OTP both succeed only if that email already exists and is active.

## Goal

Campus-scoped users can sign in with email OTP or Google, must accept a one-time e-declaration, and land on the correct dashboard. Sessions live in Valkey.

## Out of scope

- Passwords, password reset, Better Auth, NextAuth, Lucia, Clerk
- TOTP / optional MFA enroll
- Public registration
- Industry Supervisor login (token path is M05)
- Course catalog / LR

## Backend

1. **Do not install an auth framework.** Write a small `lib/auth/` module:
   - `session.ts` — create / read / destroy session
   - `otp.ts` — generate, hash, store, verify
   - `google.ts` — OAuth URL, token exchange, email extract
   - `guards.ts` — `requireSession`, `requireRole`
2. `users` collection: name, email (unique, lowercase), googleSub (sparse unique), registrationNo (sparse unique), campusId, departmentId, programmeId, roles[], active, lastLoginAt, lastLoginMethod (`OTP` | `GOOGLE`). **No passwordHash. No mfaEnabled.**
3. Session: **opaque id, not JWT.** Cookie `alr_session` (httpOnly, sameSite=lax, secure in prod, `maxAge` = 7 days) ↔ Valkey `sess:{sid}` `{ userId, roles, campusId, declarationAcceptedAt, loginMethod }`. Cookie HMAC/`AUTH_SECRET` only to stop tampering. Valkey TTL = 7 days (`SESSION_TTL_DAYS=7`). Refresh both back to 7 days if the session is still valid and older than 1 day. Do **not** put roles or user id in a JWT. Google `id_token` is parsed once then discarded.
4. **Email + OTP**
   - Server Action `requestOtp(email)`: lookup active user by email. If missing, return the same generic success message (do not leak whether the email exists). If found, generate 6-digit OTP, store `sha256(otp + AUTH_SECRET)` in Valkey `otp:{email}` TTL `OTP_TTL_SECONDS` (default 600), set `otp:attempts:{email}` max 5. Rate limit `rl:otp:{email}` and `rl:auth:{ip}`.
   - Enqueue `notify.email` job `auth.otp` with `{ to, code }`. Processor: if SMTP env is unset, **log OTP to worker console** (dev). If SMTP is set, send a short mail. Never log OTP from the Next.js request path in production; console log is allowed when `APP_URL` is localhost.
   - Server Action `verifyOtp(email, code)`: compare hash, delete key on success, create session. Wrong code increments attempts; lock 15m after 5 fails.
5. **Sign in with Google**
   - `GET /api/auth/google` — build Google OAuth 2.0 authorize URL (`openid email profile`), store `oauth:state:{state}` in Valkey TTL 10m, redirect.
   - `GET /api/auth/google/callback` — validate state, exchange code, read `email` + `sub` from userinfo / id_token. Find `users` by email (case-insensitive). If no user or inactive → `/login?error=not_provisioned`. On success set `googleSub` if empty (must not collide with another user), create session, redirect to role home or declaration.
   - If `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are missing, hide the Google button and do not register broken routes that 500; show “Google sign-in is not configured”.
6. Server Action `signOut` clears cookie + Valkey session. `acceptDeclaration` requires session.
7. `proxy.ts`: cookie missing on `/(app)` paths → `/login`. Cookie present on `/login` → role home. **Do not** load Mongo in proxy.
8. First-login: if `declarationAcceptedAt` missing, all `(app)` pages render only the declaration gate. Store `declarations` { userId, acceptedAt, ip, userAgent, textVersion }.
9. Industry Supervisor is **not** a login user.
10. `GET /api/health` still works.

## Org models

- `Department` — campusId, name, code
- `Programme` — campusId, departmentId, name, award (Diploma/UG/PG), durationYears (2–4 typical), branch, specialization
- `User` as above
- Keep `Campus` from M00

Indexes from architecture.md plus sparse unique `googleSub`.

## Frontend

1. `/login` — university card with two paths only:
   - Email field → Continue → OTP field (6 digits) → Verify
   - **Sign in with Google** button (OAuth start URL)
   - Errors via `useActionState`. No password field anywhere.
   - Form island is dynamic; chrome may stay cached.
2. Replace `DEV_ROLE` hack: sidebar from `session.roles`. Multi-role switcher (`?role=` or cookie). Deep links still ACL-checked.
3. Declaration full-page: policy text, required checkbox, Accept.
4. Each dashboard shows: name, roles, campus badge, last login method, “declaration accepted”.
5. Admin: user table (name, email, roles, campus, active, last login). **Create user** action: name, email, campus, roles, optional registrationNo. No temporary password. Copy: “They will sign in with email OTP or Google using this email.”
6. Forbidden page when a Student hits `/admin`.
7. `/login?error=not_provisioned` — “This Google account is not provisioned. Ask your Admin.”

## Env (add to `.env.example` this milestone)

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

`AUTH_SECRET` is required after this milestone. Google and SMTP are optional; OTP console log is the local default.

## Seed (`scripts/seed-m01.ts`)

Create one of each login role on Bhubaneswar + one student on Paralakhemundi + one Faculty who is also Mentor+Supervisor. **No passwords.** Print emails. Document: request OTP for that email; with `OTP_DEV_LOG=true` the worker prints the code.

## Acceptance

- Seed user: request OTP → worker/console shows code → verify → session works.
- Unknown email: same generic “If this email is registered, an OTP was sent” — no user created.
- 5 bad OTPs lock that email for 15 minutes (Valkey).
- Logout clears cookie + Valkey `sess:*`. Cookie `maxAge` is 7 days; session still works after a browser restart within 7 days.
- No JWT package; no JWT in cookies.
- Google callback with a provisioned email creates a session; unknown Google email does not create a user.
- First login blocks dashboards until declaration; second login does not re-prompt.
- Multi-role user can switch Faculty/Mentor/Supervisor shells.
- Student cannot open `/admin`.
- No password field, no Better Auth package, no `passwordHash` on users.
- Landing remains cached; dashboards are dynamic.
- `npm run build` succeeds.
- Update `docs/BUILD-TRACKER.md`.

Stop after this.
