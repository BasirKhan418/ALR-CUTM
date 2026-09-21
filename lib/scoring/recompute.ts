import { ClassroomComponents } from "@/lib/db/models/classroom-components"
import { Course } from "@/lib/db/models/course"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { SubjectScore } from "@/lib/db/models/subject-score"
import { connectMongo } from "@/lib/db/mongo"
import type { CourseRecordConfig } from "@/lib/domain/catalog"
import { normalizeContribution } from "@/lib/domain/normalize"
import {
  ACTION_CRITERIA,
  ACTION_ENTRY_MAX,
  APPLIED_CRITERIA,
  APPLIED_ENTRY_MAX,
  CLASSROOM_ENTRY_MAX,
  actionTotal,
  appliedTotal,
  classroomTotal,
  type ActionScores,
  type AppliedScores,
} from "@/lib/domain/scoring"
import { isMajorLrRecordType } from "@/lib/domain/deliverable"
import type { RecordType } from "@/lib/domain/record-types"

function configFor(course: { recordConfigs: CourseRecordConfig[] }, recordType: RecordType) {
  return course.recordConfigs.find((item) => item.recordType === recordType) ?? null
}

function completeApplied(scores?: Record<string, number> | null): AppliedScores | null {
  if (!scores) return null
  const next = {} as AppliedScores
  for (const item of APPLIED_CRITERIA) {
    const value = Number(scores[item.key])
    if (!Number.isFinite(value)) return null
    next[item.key] = value
  }
  return next
}

function completeAction(scores?: Record<string, number> | null): ActionScores | null {
  if (!scores) return null
  const next = {} as ActionScores
  for (const item of ACTION_CRITERIA) {
    const value = Number(scores[item.key])
    if (!Number.isFinite(value)) return null
    next[item.key] = value
  }
  return next
}

async function writeScore(input: {
  campusId: string
  studentId: string
  courseId: string
  termId: string
  recordType: RecordType
  rawAverage: number
  entryMax: number
  frameworkMarks: number
  normalized: number
  formulaId: "scale_average" | "classroom_composites"
}) {
  await SubjectScore.updateOne(
    {
      studentId: input.studentId,
      courseId: input.courseId,
      recordType: input.recordType,
    },
    {
      $set: {
        campusId: input.campusId,
        studentId: input.studentId,
        courseId: input.courseId,
        termId: input.termId,
        recordType: input.recordType,
        rawAverage: input.rawAverage,
        entryMax: input.entryMax,
        frameworkMarks: input.frameworkMarks,
        normalized: input.normalized,
        formulaId: input.formulaId,
        computedAt: new Date(),
      },
    },
    { upsert: true }
  )
}

export async function recomputeSubjectScore(
  studentId: string,
  courseId: string,
  recordType: RecordType
) {
  await connectMongo()
  const course = await Course.findById(courseId)
  if (!course) return
  const config = configFor(course, recordType)
  if (!config) {
    await SubjectScore.deleteOne({ studentId, courseId, recordType })
    return
  }

  if (recordType === "CLASSROOM_LEARNING") {
    const row = await ClassroomComponents.findOne({
      studentId,
      courseId,
      termId: course.termId,
    })
    if (!row) {
      await SubjectScore.deleteOne({ studentId, courseId, recordType })
      return
    }
    const raw = classroomTotal({
      assignment: row.assignment,
      presentation: row.presentation,
      midSem: row.midSem,
      recordMark: row.recordMark,
    })
    await writeScore({
      campusId: String(course.campusId),
      studentId,
      courseId,
      termId: String(course.termId),
      recordType,
      rawAverage: raw,
      entryMax: CLASSROOM_ENTRY_MAX,
      frameworkMarks: config.frameworkMarks,
      normalized: raw,
      formulaId: "classroom_composites",
    })
    return
  }

  if (isMajorLrRecordType(recordType)) {
    const types =
      recordType === "PROJECT_REPORT"
        ? ["MINOR_PROJECT", "MAJOR_PROJECT"]
        : recordType === "INTERNSHIP_REPORT"
          ? ["INTERNSHIP"]
          : ["PG_THESIS"]
    const deliverable = await MajorDeliverable.findOne({
      courseId,
      candidateIds: studentId,
      type: { $in: types },
    }).lean()
    const total =
      recordType === "INTERNSHIP_REPORT"
        ? deliverable?.internScores?.total
        : deliverable?.rubricScores?.total
    if (total === undefined || !Number.isFinite(total)) {
      await SubjectScore.deleteOne({ studentId, courseId, recordType })
      return
    }
    await writeScore({
      campusId: String(course.campusId),
      studentId,
      courseId,
      termId: String(course.termId),
      recordType,
      rawAverage: total,
      entryMax: config.entryMax,
      frameworkMarks: config.frameworkMarks,
      normalized: normalizeContribution({
        scores: [total],
        entryMax: config.entryMax,
        frameworkMarks: config.frameworkMarks,
      }),
      formulaId: "scale_average",
    })
    return
  }

  const entries = await LrEntry.find({
    studentId,
    courseId,
    recordType,
    status: "SUBMITTED",
  }).lean()

  const totals =
    recordType === "APPLIED_ACTION_LEARNING"
      ? entries
          .map((entry) => completeApplied(entry.facultyScores))
          .filter((scores): scores is AppliedScores => Boolean(scores))
          .map(appliedTotal)
      : recordType === "ACTION_LEARNING"
        ? entries
            .map((entry) => completeAction(entry.facultyScores))
            .filter((scores): scores is ActionScores => Boolean(scores))
            .map(actionTotal)
        : []

  if (totals.length === 0) {
    await SubjectScore.deleteOne({ studentId, courseId, recordType })
    return
  }

  const rawAverage = totals.reduce((sum, value) => sum + value, 0) / totals.length
  const entryMax =
    recordType === "APPLIED_ACTION_LEARNING" ? APPLIED_ENTRY_MAX : ACTION_ENTRY_MAX
  const normalized = normalizeContribution({
    scores: totals,
    entryMax,
    frameworkMarks: config.frameworkMarks,
  })

  await writeScore({
    campusId: String(course.campusId),
    studentId,
    courseId,
    termId: String(course.termId),
    recordType,
    rawAverage,
    entryMax,
    frameworkMarks: config.frameworkMarks,
    normalized,
    formulaId: "scale_average",
  })
}
