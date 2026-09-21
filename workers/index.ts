import { Worker } from "bullmq"
import { QUEUE_NAMES } from "@/lib/queue/queues"
import { getValkeyQueue } from "@/lib/valkey"
import { processNotify } from "@/workers/processors/notify"
import { processPing } from "@/workers/processors/ping"

const connection = getValkeyQueue()

const maintenanceWorker = new Worker(
  QUEUE_NAMES.maintenance,
  async (job) => {
    if (job.name === "ping") {
      return processPing(job)
    }
  },
  { connection }
)

const notifyWorker = new Worker(
  QUEUE_NAMES.notify,
  async (job) => processNotify(job),
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

async function shutdown() {
  await Promise.all([maintenanceWorker.close(), notifyWorker.close()])
  connection.disconnect()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
