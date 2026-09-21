"use server"

import { Types } from "mongoose"
import { revalidatePath } from "next/cache"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { AuditLog } from "@/lib/db/models/audit-log"
import { AiScoreRun } from "@/lib/db/models/ai-score-run"
import { ClassroomComponents } from "@/lib/db/models/classroom-components"
import { Course } from "@/lib/db/models/course"
import { Enrollment } from "@/lib/db/models/enrollment"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { connectMongo } from "@/lib/db/mongo"
import { CLASSROOM_COMPOSITE_DEFAULT } from "@/lib/domain/weights"
import {
  scoresDiffer,
  validateActionScores,
  validateAppliedScores,
  validateClassroomMarks,
  type ActionScores,
  type AppliedScores,
} from "@/lib/domain/scoring"
import { scoringQueue } from "@/lib/queue/queues"
import { writeAiProgress } from "@/lib/scoring/progress"
import { loadAiScoreStatus } from "@/lib/scoring/queries"
import { recomputeSubjectScore } from "@/lib/scoring/recompute"
import type { AiScoreStatusView } from "@/lib/scoring/types"

export type ScoreFormState = {
  ok: boolean
  message?: string
  runId?: string
}

function objectId(value: string) {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null
}

function numberField(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim()
  return raw === "" ? Number.NaN : Number(raw)
}

async function requireAssignedFaculty(courseId: string) {
  const session = await requireSession()
  if (hasRole(session, "MENTOR") && !hasRole(session, "FACULTY")) {
    return { session: null as null, error: "Mentors cannot score subject entries." }
  }
  if (!hasRole(session, "FACULTY")) {
    return { session: null as null, error: "Only assigned faculty can score." }
  }
  await connectMongo()
  const assigned = await FacultyAssignment.findOne({
    courseId,
    userId: session.userId,
    role: "FACULTY",
  })
  if (!assigned) {
    return {
      session: null as null,
      error: "Only the assigned course faculty can score this subject.",
    }
  }
  return { session, error: null }
}

function invalidateScores(courseId: string, entryId?: string) {
  revalidatePath("/faculty/inbox")
  revalidatePath(`/faculty/courses/${courseId}`)
  revalidatePath("/student")
  revalidatePath(`/student/courses/${courseId}`)
  if (entryId) revalidatePath(`/faculty/inbox/${entryId}`)
}

async function maybeRecordOverride(
  entryId: string,
  scores: Record<string, number>,
  reason: string,
  actorId: string
) {
  const run = await AiScoreRun.findOne({ entryId, status: "DONE" }).sort({
    createdAt: -1,
  })
  if (!run?.suggestedScores) return { ok: true as const }
  if (!scoresDiffer(scores, run.suggestedScores)) return { ok: true as const }
  const trimmed = reason.trim()
  if (!trimmed) {
    return {
      ok: false as const,
      message: "An override reason is required when you change the AI draft.",
    }
  }
  run.override = {
    by: new Types.ObjectId(actorId),
    reason: trimmed,
    at: new Date(),
    finalScores: scores,
  }
  await run.save()
  return { ok: true as const }
}

export async function scoreAppliedEntry(
  _prev: ScoreFormState,
  formData: FormData
): Promise<ScoreFormState> {
  const entryId = String(formData.get("entryId") ?? "").trim()
  if (!objectId(entryId)) return { ok: false, message: "Entry is required." }
  await connectMongo()
  const entry = await LrEntry.findById(entryId)
  if (!entry) return { ok: false, message: "Entry was not found." }
  const { session, error } = await requireAssignedFaculty(String(entry.courseId))
  if (!session) return { ok: false, message: error }
  if (entry.status !== "SUBMITTED") {
    return { ok: false, message: "Only submitted records can be scored." }
  }
  if (entry.recordType !== "APPLIED_ACTION_LEARNING") {
    return { ok: false, message: "Use the Applied rubric on Applied entries." }
  }

  const scores: AppliedScores = {
    concept: numberField(formData, "concept"),
    planning: numberField(formData, "planning"),
    result: numberField(formData, "result"),
    record: numberField(formData, "record"),
    viva: numberField(formData, "viva"),
  }
  const invalid = validateAppliedScores(scores)
  if (invalid) return { ok: false, message: invalid }

  const override = await maybeRecordOverride(
    String(entry._id),
    scores,
    String(formData.get("overrideReason") ?? ""),
    session.userId
  )
  if (!override.ok) return { ok: false, message: override.message }

  entry.facultyScores = scores
  entry.facultyRemarks = String(formData.get("facultyRemarks") ?? "").trim() || undefined
  entry.scoredBy = new Types.ObjectId(session.userId)
  entry.scoredAt = new Date()
  await entry.save()
  await recomputeSubjectScore(
    String(entry.studentId),
    String(entry.courseId),
    "APPLIED_ACTION_LEARNING"
  )
  await AuditLog.create({
    actorId: session.userId,
    action: "score.applied",
    payload: { entryId, scores },
  })
  invalidateScores(String(entry.courseId), entryId)
  return { ok: true, message: "Applied scores saved. Subject contribution was recomputed." }
}

export async function scoreActionEntry(
  _prev: ScoreFormState,
  formData: FormData
): Promise<ScoreFormState> {
  const entryId = String(formData.get("entryId") ?? "").trim()
  if (!objectId(entryId)) return { ok: false, message: "Entry is required." }
  await connectMongo()
  const entry = await LrEntry.findById(entryId)
  if (!entry) return { ok: false, message: "Entry was not found." }
  const { session, error } = await requireAssignedFaculty(String(entry.courseId))
  if (!session) return { ok: false, message: error }
  if (entry.status !== "SUBMITTED") {
    return { ok: false, message: "Only submitted records can be scored." }
  }
  if (entry.recordType !== "ACTION_LEARNING") {
    return { ok: false, message: "Use the Workshop rubric on Action Learning entries." }
  }

  const scores: ActionScores = {
    criticalThinking: numberField(formData, "criticalThinking"),
    presentationViva: numberField(formData, "presentationViva"),
  }
  const invalid = validateActionScores(scores)
  if (invalid) return { ok: false, message: invalid }

  const override = await maybeRecordOverride(
    String(entry._id),
    scores,
    String(formData.get("overrideReason") ?? ""),
    session.userId
  )
  if (!override.ok) return { ok: false, message: override.message }

  entry.facultyScores = scores
  entry.facultyRemarks = String(formData.get("facultyRemarks") ?? "").trim() || undefined
  entry.scoredBy = new Types.ObjectId(session.userId)
  entry.scoredAt = new Date()
  await entry.save()
  await recomputeSubjectScore(
    String(entry.studentId),
    String(entry.courseId),
    "ACTION_LEARNING"
  )
  await AuditLog.create({
    actorId: session.userId,
    action: "score.action",
    payload: { entryId, scores },
  })
  invalidateScores(String(entry.courseId), entryId)
  return { ok: true, message: "Workshop scores saved. Subject contribution was recomputed." }
}

export async function upsertClassroomComponents(
  _prev: ScoreFormState,
  formData: FormData
): Promise<ScoreFormState> {
  const courseId = String(formData.get("courseId") ?? "").trim()
  const studentId = String(formData.get("studentId") ?? "").trim()
  if (!objectId(courseId) || !objectId(studentId)) {
    return { ok: false, message: "Course and student are required." }
  }
  const { session, error } = await requireAssignedFaculty(courseId)
  if (!session) return { ok: false, message: error }

  await connectMongo()
  const enrolled = await Enrollment.findOne({ studentId, courseId })
  if (!enrolled) {
    return { ok: false, message: "That student is not enrolled in this course." }
  }
  const course = await Course.findById(courseId)
  if (!course) return { ok: false, message: "Course was not found." }
  const config = course.recordConfigs.find(
    (item: { recordType: string }) => item.recordType === "CLASSROOM_LEARNING"
  )
  if (!config) {
    return { ok: false, message: "This subject does not require Classroom Learning." }
  }
  const weights = config.compositeWeights ?? CLASSROOM_COMPOSITE_DEFAULT
  const marks = {
    assignment: numberField(formData, "assignment"),
    presentation: numberField(formData, "presentation"),
    midSem: numberField(formData, "midSem"),
    recordMark: numberField(formData, "recordMark"),
  }
  const invalid = validateClassroomMarks(marks, weights)
  if (invalid) return { ok: false, message: invalid }

  await ClassroomComponents.updateOne(
    { studentId, courseId, termId: course.termId },
    {
      $set: {
        campusId: course.campusId,
        studentId,
        courseId,
        termId: course.termId,
        ...marks,
        source: "MANUAL",
        updatedBy: session.userId,
      },
    },
    { upsert: true }
  )
  await recomputeSubjectScore(studentId, courseId, "CLASSROOM_LEARNING")
  await AuditLog.create({
    actorId: session.userId,
    action: "score.classroom",
    payload: { courseId, studentId, marks },
  })
  invalidateScores(courseId)
  return { ok: true, message: "Classroom composites saved. Subject contribution was recomputed." }
}

export async function enqueueAiScore(
  _prev: ScoreFormState,
  formData: FormData
): Promise<ScoreFormState> {
  const entryId = String(formData.get("entryId") ?? "").trim()
  if (!objectId(entryId)) return { ok: false, message: "Entry is required." }
  await connectMongo()
  const entry = await LrEntry.findById(entryId)
  if (!entry) return { ok: false, message: "Entry was not found." }
  const { session, error } = await requireAssignedFaculty(String(entry.courseId))
  if (!session) return { ok: false, message: error }
  if (entry.status !== "SUBMITTED") {
    return { ok: false, message: "Ask AI only after the student submits." }
  }
  if (
    entry.recordType !== "APPLIED_ACTION_LEARNING" &&
    entry.recordType !== "ACTION_LEARNING"
  ) {
    return { ok: false, message: "AI drafts scores for Applied and Workshop entries only." }
  }

  const run = await AiScoreRun.create({
    entryId: entry._id,
    campusId: entry.campusId,
    courseId: entry.courseId,
    studentId: entry.studentId,
    provider: "STUB",
    status: "QUEUED",
  })
  const job = await scoringQueue().add("ai.score.entry", {
    runId: String(run._id),
    entryId: String(entry._id),
    recordType: entry.recordType,
  })
  run.jobId = String(job.id)
  await run.save()
  await writeAiProgress(String(job.id), {
    status: "QUEUED",
    percent: 5,
    message: "Queued stub AI scoring",
  })
  await AuditLog.create({
    actorId: session.userId,
    action: "score.ai.enqueue",
    payload: { entryId, runId: String(run._id), jobId: job.id },
  })
  return {
    ok: true,
    message: "AI draft queued. Suggested marks will appear when the worker finishes.",
    runId: String(run._id),
  }
}

export async function overrideAiScore(
  _prev: ScoreFormState,
  formData: FormData
): Promise<ScoreFormState> {
  const runId = String(formData.get("runId") ?? "").trim()
  const reason = String(formData.get("overrideReason") ?? "").trim()
  if (!objectId(runId)) return { ok: false, message: "AI run is required." }
  if (!reason) return { ok: false, message: "An override reason is required." }

  await connectMongo()
  const run = await AiScoreRun.findById(runId)
  if (!run) return { ok: false, message: "AI run was not found." }
  const { session, error } = await requireAssignedFaculty(String(run.courseId))
  if (!session) return { ok: false, message: error }

  const entry = await LrEntry.findById(run.entryId)
  if (!entry) return { ok: false, message: "Entry was not found." }
  if (
    entry.recordType !== "APPLIED_ACTION_LEARNING" &&
    entry.recordType !== "ACTION_LEARNING"
  ) {
    return { ok: false, message: "AI drafts scores for Applied and Workshop entries only." }
  }

  const scores =
    entry.recordType === "ACTION_LEARNING"
      ? {
          criticalThinking: numberField(formData, "criticalThinking"),
          presentationViva: numberField(formData, "presentationViva"),
        }
      : {
          concept: numberField(formData, "concept"),
          planning: numberField(formData, "planning"),
          result: numberField(formData, "result"),
          record: numberField(formData, "record"),
          viva: numberField(formData, "viva"),
        }
  const invalid =
    entry.recordType === "ACTION_LEARNING"
      ? validateActionScores(scores as ActionScores)
      : validateAppliedScores(scores as AppliedScores)
  if (invalid) return { ok: false, message: invalid }

  run.override = {
    by: new Types.ObjectId(session.userId),
    reason,
    at: new Date(),
    finalScores: scores,
  }
  await run.save()

  if (entry.recordType === "APPLIED_ACTION_LEARNING") {
    return scoreAppliedEntry(
      { ok: false },
      (() => {
        const next = new FormData()
        next.set("entryId", String(entry._id))
        next.set("overrideReason", reason)
        next.set("facultyRemarks", String(formData.get("facultyRemarks") ?? ""))
        for (const [key, value] of Object.entries(scores)) next.set(key, String(value))
        return next
      })()
    )
  }
  return scoreActionEntry(
    { ok: false },
    (() => {
      const next = new FormData()
      next.set("entryId", String(entry._id))
      next.set("overrideReason", reason)
      next.set("facultyRemarks", String(formData.get("facultyRemarks") ?? ""))
      for (const [key, value] of Object.entries(scores)) next.set(key, String(value))
      return next
    })()
  )
}

export async function getAiScoreStatus(runId: string): Promise<AiScoreStatusView | null> {
  const session = await requireSession()
  if (!hasRole(session, "FACULTY")) return null
  if (!objectId(runId)) return null
  await connectMongo()
  const run = await AiScoreRun.findById(runId)
  if (!run) return null
  const assigned = await FacultyAssignment.findOne({
    courseId: run.courseId,
    userId: session.userId,
    role: "FACULTY",
  })
  if (!assigned) return null
  return loadAiScoreStatus(runId)
}
