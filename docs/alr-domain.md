# ALR Domain Bible

Source: *ALR Digitisation Platform — Compiled Review* (Centurion University). This file is the product spec. Code must not invent a simpler model.

## Product

Digital Learning Record (ALR) platform for CUTM. Paper baseline is six LR booklets. The live platform must support **twelve subject configurations**, **three evaluation tiers**, **real academic credit**, and **multi-party e-sign**, not a single Theory-shaped form.

## Campuses (exactly these six)

1. Paralakhemundi
2. Bhubaneswar
3. Balangir
4. Rayagada
5. Balasore
6. Chatrapur

Every student, faculty, course, deliverable, and analytics query is campus-scoped. HoD/Admin dashboards filter by campus.

## Roles

| Role | Purpose |
| --- | --- |
| `STUDENT` | Authors records, signs declarations, sees scores + override reasons |
| `FACULTY` | Course faculty. Subject-wise continuous evaluation. Signs CO attainment |
| `MENTOR` | Distinct from Faculty. Signs Annual PO/PSO attainment sheet |
| `SUPERVISOR` | Major deliverable guide |
| `CO_SUPERVISOR` | Optional second academic sign-off |
| `INDUSTRY_SUPERVISOR` | Internship only. **Tokenised, no-login** path |
| `HOD` | Department sign-off, year-wise forwarding, campus/dept analytics |
| `DEAN` | Constitutes committees, year/program sign-off |
| `COMMITTEE_MEMBER` | Year-wise and program-wise rubric + plagiarism case panels |
| `ADMIN` | Course/org setup, thresholds, system health |
| `EXAM_CELL` | Receives exported year/program marks and credits (integration actor) |

A user may hold multiple roles (Faculty + Mentor + Supervisor). Industry Supervisor is **not** a normal login.

## 12-way subject → record mapping

Faculty/Admin tags each course with **one combination code**. The UI must present **every** required record type for that course in the same term. Combination subjects are concurrent submissions against one course — never “one record type per course”.

| Code | Required record type(s) |
| --- | --- |
| `THEORY` | Classroom Learning |
| `MOOC` | Classroom Learning (same record, different delivery / attendance) |
| `PRACTICE` | Applied and Action Learning |
| `WORKSHOP` | Action Learning |
| `PROJECT` | Project Report |
| `THESIS` | Thesis Report |
| `INTERNSHIP` | Internship Report |
| `THEORY_PRACTICE` | Classroom + Applied and Action |
| `THEORY_PROJECT` | Classroom + Project Report |
| `THEORY_PRACTICE_PROJECT` | Classroom + Applied and Action + Project Report |
| `PRACTICE_PROJECT` | Applied and Action + Project Report |
| `THEORY_WORKSHOP` | Classroom + Action Learning |

The compiled table lists four named combinations; the Framework says twelve configurations (seven singles + five combinations). Treat `THEORY_WORKSHOP` as the fifth combination and keep the map **data-driven** in `lib/domain/subject-map.ts` so a Dean-office correction is a constant change, not a rewrite.

`MOOC` is a first-class selectable course type. Record fields match Theory; delivery mode is `MOOC` (attendance/proctoring hook later).

## Record types and Framework weights

| Record type | Code | During-program marks | Weight |
| --- | --- | --- | --- |
| Record of Classroom Learning | `CLASSROOM_LEARNING` | 10 | 10% |
| Record of Applied and Action Learning | `APPLIED_ACTION_LEARNING` | 20 | 20% |
| Record of Action Learning | `ACTION_LEARNING` | 30 | 30% |
| Project Report | `PROJECT_REPORT` | 30 | 30% |
| Thesis Report | `THESIS_REPORT` | 30 | 30% |
| Internship Report | `INTERNSHIP_REPORT` | 30 | 30% |

### Per-entry rubrics (do not collapse these)

- **Applied and Action Learning:** 50 per experiment — Concept 10 + Planning & Execution 10 + Result & Interpretation 10 + Record 10 + Viva 10.
- **Action Learning (Workshop / Production Unit):** 100 per task — 50 Critical Thinking / Fieldwork / Report + 50 Presentation & Viva. Also log **hours contributed** (not session count). Hours feed a certificate.
- **Project / Thesis / Internship:** 30 marks at both booklet and Framework level — no scale clash.
- **Annual / program five-criterion rubric (100):** Coverage of Courses 20, Coverage of Components 20, Quality of Content 20, Aesthetics 20, Presentation & Discussion 20. Committee-signed. Used at year-wise and/or program-wise (confirm in settings; both workflows must support it).

### Normalization (mandatory, surfaced in UI)

Never average raw per-entry scores and show that as the subject contribution.

```
normalized = (average(entryScore) / entryMax) * frameworkMarks
```

Examples:

- Applied: mean of experiment totals (max 50) → scale to **20**.
- Action: mean of task totals (max 100) → scale to **30**.
- Classroom: configurable split of Assignment + Presentation + Mid-Sem + Record, summing to **10**.

Store `entryMax`, `frameworkMarks`, and the formula id on the course-record config. Faculty and Student dashboards must show **raw average, formula, and normalized contribution**.

## Classroom Learning composites

Four components must exist on the Classroom Learning record (manual entry now; LMS hook later):

1. Assignment
2. Presentation
3. Mid-Sem Exam
4. The Record itself

## Three evaluation tiers (all workflows, not reports)

| Tier | When | Who | Outcome |
| --- | --- | --- | --- |
| Subject-wise | During semester, component-wise | Course Faculty (AI-assisted) | Continuous marks |
| Year-wise | After each academic year | Dean-constituted committee | 5-criterion rubric, 1 ALR credit for that year, exam-cell export, hardbound compile tracked |
| Program-wise | After program completion | Dean-constituted committee | Cumulate per-year marks, final mark, exam-cell export, credit ledger post |

Program-wise is **High priority**. It is not a transcript view.

## Credit ledger

ALR carries **1 credit per year** of the program (e.g. 4 credits on a 4-year degree), in a **Compulsory Basket**, **in addition to** normal program credits. Graduation-relevant. Must write to `credit_ledger` and expose an exam-cell / ERP export. A dashboard number alone is a fail.

## Major / Capstone deliverable (one record per deliverable, not per session)

Types: `MINOR_PROJECT` | `MAJOR_PROJECT` | `INTERNSHIP` | `PG_THESIS`.

Must carry:

- 1–3 candidates + registration numbers (UG/Diploma cover allows three names)
- Programme / Branch / Specialization / Campus / Department
- Supervisor, optional Co-supervisor, Industry Supervisor (internship)
- Title
- **Word file and PDF file, both required**
- Plagiarism report (score, tool, per-type threshold, supervisor-certified exclusions)
- Rubric + remarks
- CO Attainment sheet (Faculty)
- PG Thesis only: Paper Publication Report with 3-stage sign-off (candidate undertaking → supervisor/co-supervisor → HoD). Thesis cannot reach `SUBMITTED_FOR_EVALUATION` without it
- Sequential e-sign trail
- Status: `DRAFT → SUBMITTED → UNDER_COMMITTEE_REVIEW → APPROVED | WITHDRAWN`

Internship extras:

- Industry Supervisor tokenised form: attendance, stipend, task completion, feedback
- Auto-total **Internal 50% + External 50%** once both supervisors have entered scores

## Sign-off chains (timestamped, sequential, never a single “submitted” flag)

| Context | Chain |
| --- | --- |
| Major deliverable | Student → Supervisor → Co-supervisor (if any) → HoD/Dean |
| Year-wise | Faculty compile → HoD/Dean → Committee |
| Program-wise | Committee sign-off |
| Paper publication (PG) | Candidate → Supervisor/Co-supervisor → HoD |
| PO/PSO sheet | Mentor (not course Faculty) |
| CO sheet | Course Faculty |

Each step: actor, role, decision (`APPROVED` / `RETURNED` / `REJECTED`), reason, timestamp, optional e-sign artifact.

## Plagiarism & integrity

- Threshold is **per document type**, not one global default. Seed: default 30%; **Thesis 20%** (Turnitin guideline). Project/Internship have no published number — keep configurable, default 30% until Dean sets them.
- Exception path: attach supervisor exclusion certificate or co-author consent; mark matches `EXCLUDED_SUPERVISOR_CERTIFIED`.
- Alleged plagiarism is a **case**: committee **excluding the student's own guide**, response-window timer, recommendation record, status through Academic/Management Council ratification. `FLAGGED` is not enough.
- Programming Practice submissions use a **code-similarity** job (JPlag-style token matching), not the prose engine.
- Plan API rate-limit headroom (review saw 78% of cap). Queue + Valkey rate limiter + Admin health gauge.

## AI scoring

Allowed as assistive subject-wise scoring. Faculty may override with a **logged reason visible to the student**. Grade decisions stay human-defensible.

## First-login declaration

One e-declaration covers paper Declaration/Acknowledgement pages **and** Plagiarism Policy compliance. Checkbox at first login, not per submission.

## Archival policy (must live in settings + SRS comment in UI)

Configurable: digital copy is either `AUTHORITATIVE` or `WORKING_COPY_BESIDE_HARDBOUND`. Do not leave this implicit.

## Sign-in (email OTP or Google only)

No passwords. No Better Auth. No TOTP MFA.

- **Email + OTP:** Admin-provisioned email receives a one-time code. Verify creates the session.
- **Sign in with Google:** OAuth only if that Google email already exists as an active user. Unknown accounts are rejected, not auto-created.
- **No JWT sessions.** Opaque `alr_session` cookie, 7-day max-age, payload in Valkey.
- Compiled-review item **aa** (optional student MFA) is satisfied by OTP as the default sign-in factor. Do not add a second TOTP layer.

## Frequency (from Framework spirit)

- Classroom / Applied / Action: multiple entries per term (session / experiment / task)
- Project / Thesis / Internship: **one record per deliverable**
- Year-wise: once per academic year
- Program-wise: once per student program
