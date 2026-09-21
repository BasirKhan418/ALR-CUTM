import { Worker } from "bullmq"
import { CASE_TIMEOUT_JOB, CODE_JOB, PROSE_JOB } from "@/lib/domain/plagiarism"
import { maintenanceQueue, QUEUE_NAMES } from "@/lib/queue/queues"
import { getValkeyQueue } from "@/lib/valkey"
import { processAiScore } from "@/workers/processors/ai-score"
import { processNotify } from "@/workers/processors/notify"
import { processPing } from "@/workers/processors/ping"
import { processPlagiarismScan } from "@/workers/processors/plagiarism-scan"
import { processCaseTimeout } from "@/workers/processors/plagiarism-timeout"

const connection = getValkeyQueue()

const maintenanceWorker = new Worker(
  QUEUE_NAMES.maintenance,
  async (job) => {
    if (job.name === "ping") {
      return processPing(job)
    }
    if (job.name === CASE_TIMEOUT_JOB) {
      return processCaseTimeout()
    }
  },
  { connection }
)

const notifyWorker = new Worker(
  QUEUE_NAMES.notify,
  async (job) => processNotify(job),
  { connection }
)

const plagiarismWorker = new Worker(
  QUEUE_NAMES.plagiarism,
  async (job) => {
    if (job.name === PROSE_JOB) return processPlagiarismScan(job)
  },
  { connection }
)

const codeWorker = new Worker(
  QUEUE_NAMES.codeSimilarity,
  async (job) => {
    if (job.name === CODE_JOB) return processPlagiarismScan(job)
  },
  { connection }
)

const scoringWorker = new Worker(
  QUEUE_NAMES.scoring,
  async (job) => {
    if (job.name === "ai.score.entry") {
      return processAiScore(job)
    }
  },
  { connection }
)

function listen(worker: Worker, queue: string) {
  worker.on("ready", () => {
    console.log(`[worker] listening on ${queue}`)
  })
  worker.on("completed", (job) => {
    console.log(`[worker] completed ${job.name} ${job.id}`)
  })
  worker.on("failed", (job, error) => {
    console.error(`[worker] failed ${job?.name} ${job?.id}`, error)
  })
}

listen(maintenanceWorker, QUEUE_NAMES.maintenance)
listen(notifyWorker, QUEUE_NAMES.notify)
listen(scoringWorker, QUEUE_NAMES.scoring)
listen(plagiarismWorker, QUEUE_NAMES.plagiarism)
listen(codeWorker, QUEUE_NAMES.codeSimilarity)

void maintenanceQueue().upsertJobScheduler(
  "plagiarism-case-timeout",
  { every: 15 * 60 * 1000 },
  { name: CASE_TIMEOUT_JOB }
)

async function shutdown() {
  await Promise.all([
    maintenanceWorker.close(),
    notifyWorker.close(),
    scoringWorker.close(),
    plagiarismWorker.close(),
    codeWorker.close(),
  ])
  connection.disconnect()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
