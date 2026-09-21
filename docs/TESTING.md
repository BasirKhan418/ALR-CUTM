# How to test ALR (M00 + M01)

This is the local test playbook. No passwords.

**Dummy seed users (from `npm run seed:m01`) enter directly.** Type the email, click Continue, no OTP. Invitation-based OTP comes later.

**OTP is asked for:**

- a new `@cutm.ac.in` or `@cutm.edu.in` email that is not in the seed list
- `khanbasir5556@gmail.com`

Any other Gmail or domain is rejected. No account is created for those.

If an allowed non-dummy email has no account yet, the first **Continue** creates it (CUTM / `5556` → Student) and then asks for OTP.

---

## 1. One-time setup

From the repo root (`alr/`):

```bash
cp .env.example .env.local
```

Edit `.env.local` so these exist (do not commit this file):

```bash
MONGODB_URI=...          # required
VALKEY_URL=...           # required
APP_URL=http://localhost:3000
AUTH_SECRET=any-long-local-secret
SESSION_TTL_DAYS=7
OTP_TTL_SECONDS=600
OTP_DEV_LOG=true
GOOGLE_CLIENT_ID=        # leave empty unless you test Google
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

`AUTH_SECRET` is required after M01. Restart `npm run dev` and `npm run worker` after you change `.env.local`.

For local testing, `.env.local` should use Docker, not a remote `rediss://` host (that is what caused worker `ETIMEDOUT`):

```bash
MONGODB_URI=mongodb://localhost:27017/alr
VALKEY_URL=redis://localhost:6379
```

```bash
docker compose up -d
```

If seed says `ECONNREFUSED 127.0.0.1:27017`, Mongo is not up yet — run compose first. If the worker prints `connect ETIMEDOUT` on a TLS socket, `VALKEY_URL` is still pointing at a remote Valkey. Switch it to `redis://localhost:6379` and restart `npm run worker`.

Then seed:

```bash
npm run seed:m00
npm run seed:m01
```

`seed:m01` also upserts campuses, so it is enough if you only care about login users. It prints the seeded emails in the same terminal.

---

## 2. What to run (3 terminals)

Keep these running the whole time you test.

### Terminal A — app

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

OTP codes print here **only for non-dummy emails** (new CUTM addresses or `khanbasir5556@gmail.com`):

```text
[otp] khanbasir5556@gmail.com 123456
```

Dummy seed emails do **not** print a code. They sign in on Continue.

### Terminal B — worker

```bash
npm run worker
```

You should see:

```text
[worker] listening on maintenance
[worker] listening on notify
```

When a **non-dummy** OTP job runs and SMTP is unset, the same code also prints here:

```text
[otp] student.bbsr@cutm.ac.in 123456
[worker] completed auth.otp ...
```

If SMTP is unset, **either** Terminal A or Terminal B is enough. Use A first; it is the fastest.

### Terminal C — one-off commands

Use this for seed, health, lint. Do not stop A or B.

```bash
npm run seed:m01
curl -sS http://localhost:3000/api/health
```

Health should look like:

```json
{"ok":true,"mongo":"ok","valkey":"ok","queues":{...}}
```

If `mongo` or `valkey` is `"error"`, fix `.env.local` / Docker before testing login.

---

## 3. Where everything lives

| What | Where |
| --- | --- |
| App | [http://localhost:3000](http://localhost:3000) |
| Login | [http://localhost:3000/login](http://localhost:3000/login) |
| Student | `/student` |
| Faculty / Mentor / Supervisor | `/faculty` `/mentor` `/supervisor` |
| HoD / Dean / Admin | `/hod` `/dean` `/admin` |
| Health | `/api/health` |
| OTP code | Terminal A / B — only for non-dummy emails |
| Dummy login | Type a seeded email → Continue → no OTP |
| Seeded users | Output of `npm run seed:m01` |
| Session cookie | Browser → Application → Cookies → `localhost` → `alr_session` (httpOnly, 7 days) |
| Env | `.env.local` (never commit) |

There is **no inbox** unless you set SMTP. Do not look in Gmail for the OTP.

---

## 4. Seeded accounts

All of these are already in the database after `npm run seed:m01`. None have a password.

| Email | Role | Campus |
| --- | --- | --- |
| `student.bbsr@cutm.ac.in` | Student | Bhubaneswar |
| `faculty.bbsr@cutm.ac.in` | Faculty | Bhubaneswar |
| `mentor.bbsr@cutm.ac.in` | Mentor | Bhubaneswar |
| `supervisor.bbsr@cutm.ac.in` | Supervisor | Bhubaneswar |
| `hod.bbsr@cutm.ac.in` | HoD | Bhubaneswar |
| `dean.bbsr@cutm.ac.in` | Dean | Bhubaneswar |
| `admin.bbsr@cutm.ac.in` | Admin | Bhubaneswar |
| `faculty.multi@cutm.ac.in` | Faculty + Mentor + Supervisor | Bhubaneswar |
| `student.pkd@cutm.ac.in` | Student | Paralakhemundi |
| `khanbasir5555@gmail.com` | Admin (dummy Gmail — no OTP) | Bhubaneswar |

OTP-only Gmail (not a dummy, not in the table above): `khanbasir5556@gmail.com` (created on first Continue, Student).

---

## 5. How to sign in

### Dummy seed email (no OTP)

1. Open `/login`.
2. Type one of the emails from section 4, e.g. `student.bbsr@cutm.ac.in` or `khanbasir5555@gmail.com`.
3. Click **Continue**.
4. First time only: accept the e-declaration.
5. You land on that user’s workspace.

### New / OTP email

1. Open `/login`.
2. Type a new `@cutm.ac.in` / `@cutm.edu.in` address, or `khanbasir5556@gmail.com`.
3. Click **Continue**.
4. Watch Terminal A for `[otp] email 6digits`.
5. Type the code → **Verify**.
6. First time only: accept the e-declaration.

Codes expire in 10 minutes. Five wrong codes lock that email for 15 minutes.

---

## 6. Test cases (do these in order)

### A. Landing

1. Open [http://localhost:3000](http://localhost:3000).
2. CUTM logo and **Sign in** should show.
3. Click **Sign in** → `/login`.
4. Confirm there is **no password** field.

### B. Happy path — dummy Student (no OTP)

1. Email: `student.bbsr@cutm.ac.in`.
2. Continue — no code field.
3. Accept declaration the first time.
4. You should be on `/student`.
5. Card should show name, campus **Bhubaneswar**, role **STUDENT**, declaration **Accepted**.

### C. Session

1. Refresh `/student` — still signed in.
2. Close the tab, open `/student` again — still signed in (7-day cookie).
3. Click **Sign out** — back to `/login`.
4. Open `/student` while signed out — redirect to `/login`.

### D. Blocked Gmail

1. Sign out.
2. On `/login` enter `someone@gmail.com`.
3. Continue.
4. Stay on the email step. Message:

   `Use a @cutm.ac.in or @cutm.edu.in email. Gmail is not accepted except the designated accounts.`

5. Terminal A must **not** print an OTP for that address.
6. No new user should appear later on `/admin`.

### E. Dummy Gmail admin (no OTP)

1. Email: `khanbasir5555@gmail.com`.
2. Continue — no OTP.
3. Accept declaration if asked.
4. You should land on `/admin` and see the user table.

### E2. OTP Gmail

1. Email: `khanbasir5556@gmail.com`.
2. Continue → OTP in Terminal A → Verify.
3. Accept declaration if asked.
4. You should land on `/student` (auto-created Student).

### F. Auto-create a new CUTM email

1. Sign out.
2. Use a **new** unused address, e.g. `new.tester@cutm.edu.in`.
3. Continue. An account is created (Student, Bhubaneswar).
4. OTP in Terminal A → Verify → declaration → `/student`.
5. Sign in as `admin.bbsr@cutm.ac.in` or `khanbasir5555@gmail.com` and confirm that email is in the Admin user table.

`new.tester@cutm.ac.in` works the same way.

### G. Unknown / rejected domain

1. Try `name@yahoo.com` or `name@outlook.com`.
2. Same reject message as blocked Gmail.
3. No OTP, no user.

### H. Bad OTP lock

1. Request OTP for `khanbasir5556@gmail.com` or a new CUTM email (not a dummy).
2. Enter a wrong 6-digit code **five** times.
3. Sixth try: `Too many attempts. Try again in 15 minutes.`
4. Wait 15 minutes or pick a **different** email to continue other tests.

### I. Forbidden

1. Sign in as `student.bbsr@cutm.ac.in`.
2. Open [http://localhost:3000/admin](http://localhost:3000/admin).
3. You should see **Forbidden**, not the user table.

### J. Multi-role switch

1. Sign out.
2. Sign in as `faculty.multi@cutm.ac.in`.
3. Sidebar should list Faculty, Mentor, Supervisor.
4. Open each: `/faculty`, `/mentor`, `/supervisor`.
5. `/admin` should still be Forbidden.

### K. Second login — no second declaration

1. Sign out the student from test B.
2. Sign in again with the same dummy email (Continue only).
3. Declaration must **not** show again. Straight to `/student`.

### L. Admin create user

1. Sign in as `admin.bbsr@cutm.ac.in` or `khanbasir5555@gmail.com`.
2. Open `/admin`.
3. Create `created.user@cutm.ac.in` with role Student (or Faculty).
4. Creating `random@gmail.com` must fail with the domain message.
5. Sign out and sign in as that new CUTM email — it should ask for OTP.

---

## 7. Google (only if you filled Google env)

Leave this until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Restart Terminal A after saving `.env.local`.

The button on `/login` is enabled only when both values are present.

1. **Allowed CUTM Google account** (or `khanbasir5555@gmail.com`) → session created, declaration if first time.
2. **Any other Gmail** → `/login?error=domain` and no user created.
3. If Google is not configured, the button stays disabled. That is expected.

---

## 8. Optional command checks

In Terminal C, while A is running:

```bash
curl -sS http://localhost:3000/api/health
npm run lint
npm run build
```

`npm run build` should succeed. Landing (`/`) is cached. `/login` and role pages are dynamic. `/api/health` is dynamic.

---

## 9. If something fails

| Symptom | What to check |
| --- | --- |
| `/api/health` not `ok` | Mongo / Valkey URL in `.env.local`. Docker if local. |
| `AUTH_SECRET is required` | Add it to `.env.local`, restart A and B. |
| No `[otp]` line | Dummy seed email (expected). Or blocked domain. Or you need a new CUTM / `5556` address. |
| Worker not listening on `notify` | Restart `npm run worker`. OTP still prints in Terminal A on localhost. |
| Always “Please wait before requesting another code” | Rate limit (3 requests / 15 min per email). Wait or use another email. |
| Always “Too many attempts” | 5 bad codes. Wait 15 minutes or use another email. |
| Google button disabled | Env vars empty. Normal for local OTP testing. |
| Hydration overlay in the browser | Ignore if you were using automated browser tools; refresh and test by hand. |

---

## 10. Quick path (5 minutes)

```bash
npm run seed:m01
```

Terminal A: `npm run dev`  
Terminal B: `npm run worker`  
Browser: `/login` → `student.bbsr@cutm.ac.in` → Continue (no OTP) → accept declaration → `/student`.

Then try `someone@gmail.com` (must fail), `khanbasir5555@gmail.com` (direct to `/admin`), and `khanbasir5556@gmail.com` (OTP in Terminal A).
