# M09 — Polish, archival policy, hardening

Copy everything below the line into a new agent chat.

---

Implement **M09 Polish & Hardening** for ALR. Read `@docs/alr-domain.md` `@docs/architecture.md`. Feature work from M00–M08 should already be in place. This milestone closes remaining compiled-review items **y, z, bb, x** and hardens production paths. Item **aa** was implemented in M01 as email+OTP (Google as the other sign-in). **Do not add TOTP or Better Auth.**

Do not reopen mapping, scoring formulas, or case-management rules unless you find a bug.

## Scope (do all of these)

### 1. Books/Manuals (if any form missed it)

Audit every student narrative form. `booksManuals` is required (allow `"None"`). Add to booklet PDF index excerpts.

### 2. One-time acknowledgements

Declaration from M01 already exists. Ensure **no** per-submission re-checkbox for the same policy. Submission pages may show a read-only “Accepted on {date} · v{textVersion}” line.

### 3. Sign-in regression (do not change the model)

- Login remains **email + OTP** and **Sign in with Google** only.
- No password fields, no TOTP enroll page, no Better Auth.
- Confirm OTP still works when SMTP is unset (`OTP_DEV_LOG`).
- Confirm unknown Google emails still fail with `not_provisioned`.

### 4. Archival policy (explicit)

Settings UI: digital copy is `AUTHORITATIVE` or `WORKING_COPY_BESIDE_HARDBOUND` (seed the latter). Footer on booklet PDF and student exports quotes this sentence so it is not implicit.

### 5. Plagiarism headroom

- Admin can set `plagiarismHourlyCap` and a **warn-at %** (seed 70).
- When Valkey usage ≥ warn %, Admin health is amber; ≥ 90% Banner on Admin + enqueue delay doubles.
- Document in `docs/ops-plagiarism-headroom.md` (short): how to raise cap before term-end.

### 6. Audit + locks

- Confirm every sign-off and case ratification uses `lock:signoff:*` / a case lock.
- Admin `/admin/audit` filterable table (actor, action, at). No PII dump of files.

### 7. Accessibility / UX polish

- Focus states on all shadcn forms.
- Tables scroll on small screens.
- `not-found` / `forbidden` / `error` boundaries on `(app)`.
- Role home pages that were empty now deep-link to the real queues (inbox, analytics, health).

### 8. Security pass (defensive)

- Every remaining Server Action: session + role + campus scope.
- Industry token routes still session-less but token-hashed, single-use-or-rotating as already designed.
- File download Route Handler checks ACL or valid industry token.
- Do not add exploit PoCs.

## Acceptance

- Seed user can still request OTP and sign in; Google still rejects unknown emails.
- Booklet footer states the archival policy from settings.
- Changing policy in Admin updates the next booklet job.
- Health banner appears if you temporarily set cap low and enqueue plagiarism jobs.
- Audit page lists declaration accept, sign-off, credit post.
- `npm run lint` and `npm run build` succeed.
- Smoke: login → submit classroom entry → faculty score → see normalized 10% weight (regression, don’t break M03/M04).

Stop after this. The compiled-review High list should now have an implementation home. Residual university decisions (exact 12th combination code, LMS for the four classroom components, real Turnitin key) stay in settings / provider stubs — do not block.
