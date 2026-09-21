import type { Job } from "bullmq"
import { AiScoreRun } from "@/lib/db/models/ai-score-run"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { connectMongo } from "@/lib/db/mongo"
import { STUB_ACTION_SCORES, STUB_APPLIED_SCORES } from "@/lib/domain/scoring"
import { writeAiProgress } from "@/lib/scoring/progress"

export async function processAiScore(job: Job) {
  const runId = String(job.data?.runId ?? "")
  const entryId = String(job.data?.entryId ?? "")
  console.log(`[worker] ai.score.entry stub ${job.id} run=${runId} entry=${entryId}`)

  await writeAiProgress(String(job.id), {
    status: "QUEUED",
    percent: 15,
    message: "Stub AI reading the Learning Record",
  })

  await connectMongo()
  const run = await AiScoreRun.findById(runId)
  const entry = await LrEntry.findById(entryId)

  try {
    if (!run || !entry) {
      throw new Error("AI score job missing run or entry")
    }

    await writeAiProgress(String(job.id), {
      status: "QUEUED",
      percent: 55,
      message: "Stub AI drafting midpoint marks",
    })

    const suggestedScores =
      entry.recordType === "ACTION_LEARNING"
        ? { ...STUB_ACTION_SCORES }
        : { ...STUB_APPLIED_SCORES }

    run.provider = "STUB"
    run.status = "DONE"
    run.suggestedScores = suggestedScores
    run.rawOutput = "stub AI: midpoint marks, not a model chain-of-thought"
    run.jobId = String(job.id)
    run.error = undefined
    await run.save()

    await writeAiProgress(String(job.id), {
      status: "DONE",
      percent: 100,
      message: "Stub AI draft ready",
    })

    console.log(
      `[worker] ai.score.entry done ${job.id} ${entry.recordType} ${JSON.stringify(suggestedScores)}`
    )
    return { ok: true, runId, suggestedScores }
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI scoring failed"
    if (run) {
      run.status = "FAILED"
      run.error = message
      run.jobId = String(job.id)
      await run.save()
    }
    await writeAiProgress(String(job.id), {
      status: "FAILED",
      percent: 100,
      message,
    })
    throw error
  }
}
