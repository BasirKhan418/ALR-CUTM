import { AiScoreRun } from "@/lib/db/models/ai-score-run"
import { ClassroomComponents } from "@/lib/db/models/classroom-components"
import { Course } from "@/lib/db/models/course"
import { Enrollment } from "@/lib/db/models/enrollment"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { SubjectScore } from "@/lib/db/models/subject-score"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import { formulaSentence, type CourseRecordConfig } from "@/lib/domain/catalog"
import { scoresDiffer } from "@/lib/domain/scoring"
import { CLASSROOM_COMPOSITE_DEFAULT } from "@/lib/domain/weights"
import { toLrEntryView } from "@/lib/lr/serialize"
import { readAiProgress } from "@/lib/scoring/progress"
import type {
  AiScoreStatusView,
  ClassroomComponentsView,
  GradebookRow,
  ScoreableEntry,
  SubjectScoreView,
} from "@/lib/scoring/types"
import type { RecordType } from "@/lib/domain/record-types"

function toScoreView(
  row: {
    studentId: { toString(): string }
    courseId: { toString(): string }
    recordType: RecordType
    rawAverage: number
    entryMax: number
    frameworkMarks: number
    normalized: number
    formulaId: "scale_average" | "classroom_composites"
    computedAt: Date
  },
  config: CourseRecordConfig | null,
  overrideReason: string | null
): SubjectScoreView {
  return {
    studentId: String(row.studentId),
    courseId: String(row.courseId),
    recordType: row.recordType,
    rawAverage: row.rawAverage,
    entryMax: row.entryMax,
    frameworkMarks: row.frameworkMarks,
    normalized: row.normalized,
    formulaId: row.formulaId,
    formulaText: config
      ? formulaSentence(config)
      : "Normalized through the course formula.",
    weightPercent: config?.frameworkWeightPercent ?? 0,
    computedAt: row.computedAt.toISOString(),
    overrideReason,
  }
}

function emptyScore(
  studentId: string,
  courseId: string,
  config: CourseRecordConfig
): SubjectScoreView {
  return {
    studentId,
    courseId,
    recordType: config.recordType,
    rawAverage: 0,
    entryMax: config.entryMax,
    frameworkMarks: config.frameworkMarks,
    normalized: 0,
    formulaId: config.formulaId,
    formulaText: formulaSentence(config),
    weightPercent: config.frameworkWeightPercent,
    computedAt: "",
    overrideReason: null,
  }
}

async function overrideReasonsForCourse(
  courseId: string,
  studentIds?: string[]
): Promise<Map<string, string>> {
  const entryFilter: Record<string, unknown> = { courseId }
  const runFilter: Record<string, unknown> = {
    courseId,
    "override.reason": { $exists: true, $ne: "" },
  }
  if (studentIds?.length) {
    entryFilter.studentId = { $in: studentIds }
    runFilter.studentId = { $in: studentIds }
  }
  const [entries, runs] = await Promise.all([
    LrEntry.find(entryFilter)
      .select("_id studentId recordType facultyScores")
      .lean(),
    AiScoreRun.find(runFilter).sort({ updatedAt: -1 }).lean(),
  ])
  const entryById = new Map(entries.map((item) => [String(item._id), item]))
  const reasons = new Map<string, string>()
  for (const run of runs) {
    const entry = entryById.get(String(run.entryId))
    const reason = run.override?.reason
    if (!entry || !reason) continue
    if (
      run.override?.finalScores &&
      entry.facultyScores &&
      scoresDiffer(entry.facultyScores, run.override.finalScores)
    ) {
      continue
    }
    const key = `${entry.studentId}:${entry.recordType}`
    if (!reasons.has(key)) reasons.set(key, reason)
  }
  return reasons
}

export async function loadSubjectScores(
  studentId: string,
  courseId: string
): Promise<SubjectScoreView[]> {
  await connectMongo()
  const [course, rows, reasons] = await Promise.all([
    Course.findById(courseId).lean(),
    SubjectScore.find({ studentId, courseId }).lean(),
    overrideReasonsForCourse(courseId, [studentId]),
  ])
  if (!course) return []
  return rows.map((row) => {
    const config =
      course.recordConfigs.find(
        (item: CourseRecordConfig) => item.recordType === row.recordType
      ) ?? null
    return toScoreView(
      row,
      config,
      reasons.get(`${studentId}:${row.recordType}`) ?? null
    )
  })
}

export async function loadStudentScores(
  studentId: string,
  courseIds: string[]
): Promise<SubjectScoreView[]> {
  if (courseIds.length === 0) return []
  await connectMongo()
  const [courses, rows] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }).lean(),
    SubjectScore.find({ studentId, courseId: { $in: courseIds } }).lean(),
  ])
  const courseById = new Map(courses.map((course) => [String(course._id), course]))
  return rows.map((row) => {
    const course = courseById.get(String(row.courseId))
    const config =
      course?.recordConfigs.find(
        (item: CourseRecordConfig) => item.recordType === row.recordType
      ) ?? null
    return toScoreView(row, config, null)
  })
}

export async function loadCourseGradebook(courseId: string): Promise<GradebookRow[]> {
  await connectMongo()
  const [course, enrollments, scores] = await Promise.all([
    Course.findById(courseId).lean(),
    Enrollment.find({ courseId }).lean(),
    SubjectScore.find({ courseId }).lean(),
  ])
  if (!course) return []
  const students = await User.find({
    _id: { $in: enrollments.map((item) => item.studentId) },
  })
    .sort({ name: 1 })
    .lean()
  const studentIds = students.map((student) => String(student._id))
  const reasons = await overrideReasonsForCourse(courseId, studentIds)
  const scoreByKey = new Map(
    scores.map((row) => [`${row.studentId}:${row.recordType}`, row])
  )

  return students.map((student) => {
    const studentId = String(student._id)
    const cells = course.recordConfigs.map((config: CourseRecordConfig) => {
      const row = scoreByKey.get(`${studentId}:${config.recordType}`)
      if (!row) return emptyScore(studentId, courseId, config)
      return toScoreView(
        row,
        config,
        reasons.get(`${studentId}:${config.recordType}`) ?? null
      )
    })
    return {
      studentId,
      studentName: student.name,
      studentEmail: student.email,
      cells,
    }
  })
}

export async function loadClassroomComponents(
  courseId: string
): Promise<ClassroomComponentsView[]> {
  await connectMongo()
  const rows = await ClassroomComponents.find({ courseId }).lean()
  return rows.map((row) => ({
    studentId: String(row.studentId),
    assignment: row.assignment,
    presentation: row.presentation,
    midSem: row.midSem,
    recordMark: row.recordMark,
    source: "MANUAL",
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export async function loadScoreableEntry(
  entryId: string
): Promise<ScoreableEntry | null> {
  await connectMongo()
  const entry = await LrEntry.findById(entryId).lean()
  if (!entry) return null
  const [student, course, run] = await Promise.all([
    User.findById(entry.studentId).lean(),
    Course.findById(entry.courseId).lean(),
    AiScoreRun.findOne({ entryId: entry._id }).sort({ createdAt: -1 }).lean(),
  ])
  const config =
    course?.recordConfigs.find(
      (item: CourseRecordConfig) => item.recordType === entry.recordType
    ) ?? null
  return {
    ...toLrEntryView(entry),
    studentName: student?.name ?? "Student",
    studentEmail: student?.email ?? "",
    courseCode: course?.code ?? "Course",
    courseTitle: course?.title ?? "",
    facultyScores: entry.facultyScores ?? {},
    facultyRemarks: entry.facultyRemarks ?? "",
    scoredAt: entry.scoredAt ? entry.scoredAt.toISOString() : null,
    overrideReason: run?.override?.reason ?? null,
    latestAi: run ? await toAiStatus(run) : null,
    recordConfig: config,
    compositeWeights:
      config?.compositeWeights ??
      (entry.recordType === "CLASSROOM_LEARNING"
        ? CLASSROOM_COMPOSITE_DEFAULT
        : null),
  }
}

async function toAiStatus(run: {
  _id: { toString(): string }
  status: "QUEUED" | "DONE" | "FAILED"
  jobId?: string
  suggestedScores?: Record<string, number>
  error?: string
}): Promise<AiScoreStatusView> {
  const progress = run.jobId ? await readAiProgress(run.jobId) : null
  return {
    runId: String(run._id),
    status: progress?.status ?? run.status,
    percent: progress?.percent ?? (run.status === "DONE" ? 100 : 0),
    suggestedScores: run.suggestedScores ?? null,
    message: progress?.message ?? run.error,
  }
}

export async function loadAiScoreStatus(
  runId: string
): Promise<AiScoreStatusView | null> {
  await connectMongo()
  const run = await AiScoreRun.findById(runId).lean()
  if (!run) return null
  return toAiStatus(run)
}
