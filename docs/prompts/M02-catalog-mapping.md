# M02 — Academic catalog + 12-way mapping + normalization

Copy everything below the line into a new agent chat.

---

Implement **M02 Catalog & Mapping** for ALR. Read `@docs/alr-domain.md` `@docs/architecture.md`. Auth from M01 exists. Next.js 16 Cache Components: faculty/admin **read** catalog lists may use `"use cache"` + `cacheTag('catalog', campusId)` and `updateTag('catalog')` on writes.

**This milestone only.** Students cannot submit LR yet — they can only **see** which record types a course requires.

## Goal

Admin/Faculty tag a course with one of the **12 combination codes**. The platform derives required record types and stores per-type weights + normalization formula. MOOC is selectable. Dashboards show the formula, never hide it.

## Domain (must already exist from M00 — extend, don’t fork)

`lib/domain/subject-map.ts` is the single map. Course setup **cannot** pick record types by hand except by changing the combination code.

Each derived record config on a course:

```
recordType
frameworkMarks
frameworkWeightPercent
entryMax          // 50 applied, 100 action, 10 classroom-composite, 30 major
formulaId         // 'scale_average' | 'classroom_composites'
compositeWeights? // classroom only: assignment, presentation, midsem, record → sum 10
```

`normalizeContribution` remains the only math path.

## Backend

1. Models: `Course` { campusId, departmentId, programmeId, code, title, termId, combinationCode, deliveryMode: THEORY|MOOC|PRACTICE|WORKSHOP|…, recordConfigs[], createdBy }, `Enrollment` { studentId, courseId, termId }, `FacultyAssignment` { courseId, userId, role: FACULTY|MENTOR }, `Term` { name, startsAt, endsAt, academicYear }.
2. Server Actions (authz: Admin or Faculty of that department): `createCourse`, `updateCourseCombination`, `enrollStudents`, `assignFaculty`, `assignMentor` (Mentor ≠ Faculty even if same human).
3. Changing combinationCode **rebuilds** `recordConfigs` from the domain map. Do not leave stale record types.
4. Settings: allow Admin to edit default classroom composite split (must sum to 10).
5. Invalidate catalog cache tags on write.

## Frontend

1. **Admin / Faculty → Course setup**
   - Form: campus, department, programme, code, title, term, **combination code** (select with human labels).
   - Live preview panel: “This subject requires: …” chips + weight table + formula sentence, e.g. *Average of experiment scores (max 50) is scaled to 20 marks (20%)*.
   - MOOC appears in the combination list and sets `deliveryMode: MOOC` while still requiring Classroom Learning.
2. **Faculty course list** (cached catalog + dynamic assignment filter).
3. **Student → My courses**: each course card lists required record types and weights. Status “not opened” is fine.
4. Enroll UI: Admin/Faculty paste/select students for a course.
5. Show Mentor assignment separately from Faculty (“PO/PSO Mentor”).

## DB

Indexes: unique `{ code, termId }`, `{ campusId, termId, combinationCode }`, unique enrollment `{ studentId, courseId, termId }`.

Seed `scripts/seed-m02.ts`: one term; one course per combination code (12) across Bhubaneswar; enroll the seed student in `THEORY_PRACTICE_PROJECT` so later milestones have a multi-record subject.

## Acceptance

- Creating `THEORY_PRACTICE_PROJECT` shows **three** required records with 10/20/30 weights.
- Switching that course to `THEORY` drops the extra record configs.
- MOOC course shows Classroom Learning only, deliveryMode MOOC.
- Student my-courses shows the derived list, not a hardcoded Theory form.
- Normalization preview numbers match domain examples.
- Catalog list is tagged-cache; after create, new course appears (tag update).
- Mentor can be assigned independently of Faculty.
- `npm run build` succeeds.

Stop after this.
