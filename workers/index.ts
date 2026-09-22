import { Worker } from "bullmq"
import { CASE_TIMEOUT_JOB, CODE_JOB, PROSE_JOB } from "@/lib/domain/plagiarism"
import { maintenanceQueue, QUEUE_NAMES } from "@/lib/queue/queues"
import { getValkeyQueue } from "@/lib/valkey"
import { BOOKLET_JOB, WORKSHOP_CERT_JOB } from "@/lib/domain/booklet"
import { EXAM_CELL_JOB } from "@/lib/domain/tiers"
import type { ExamCellJobData } from "@/lib/domain/exam-cell"
import { processAiScore } from "@/workers/processors/ai-score"
import { processBookletExport } from "@/workers/processors/booklet"
import { processExamCellExport } from "@/workers/processors/exam-cell"
import { processNotify } from "@/workers/processors/notify"
import { processPing } from "@/workers/processors/ping"
import { processPlagiarismScan } from "@/workers/processors/plagiarism-scan"
import { processCaseTimeout } from "@/workers/processors/plagiarism-timeout"
import type { Redis } from "ioredis"

const connections: Redis[] = []

function workerConnection() {
  const client = getValkeyQueue().duplicate({ maxRetriesPerRequest: null })
  connections.push(client)
  return client
}

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
  { connection: workerConnection() }
)

const notifyWorker = new Worker(
  QUEUE_NAMES.notify,
  async (job) => processNotify(job),
  { connection: workerConnection() }
)

const plagiarismWorker = new Worker(
  QUEUE_NAMES.plagiarism,
  async (job) => {
    if (job.name === PROSE_JOB) return processPlagiarismScan(job)
  },
  { connection: workerConnection() }
)

const codeWorker = new Worker(
  QUEUE_NAMES.codeSimilarity,
  async (job) => {
    if (job.name === CODE_JOB) return processPlagiarismScan(job)
  },
  { connection: workerConnection() }
)

const scoringWorker = new Worker(
  QUEUE_NAMES.scoring,
  async (job) => {
    if (job.name === "ai.score.entry") {
      return processAiScore(job)
    }
  },
  { connection: workerConnection() }
)

const exportsWorker = new Worker(
  QUEUE_NAMES.exports,
  async (job) => {
    if (job.name === EXAM_CELL_JOB) {
      return processExamCellExport(job.data as ExamCellJobData)
    }
    if (job.name === BOOKLET_JOB || job.name === WORKSHOP_CERT_JOB) {
      return processBookletExport(job.data as { requestId?: string })
    }
  },
  { connection: workerConnection() }
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
listen(exportsWorker, QUEUE_NAMES.exports)

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
    exportsWorker.close(),
  ])
  for (const client of connections) client.disconnect()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
