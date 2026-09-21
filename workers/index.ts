import { Worker } from "bullmq"
import { QUEUE_NAMES } from "@/lib/queue/queues"
import { getValkeyQueue } from "@/lib/valkey"
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

maintenanceWorker.on("ready", () => {
  console.log(`[worker] listening on ${QUEUE_NAMES.maintenance}`)
})

maintenanceWorker.on("completed", (job) => {
  console.log(`[worker] completed ${job.name} ${job.id}`)
})

maintenanceWorker.on("failed", (job, error) => {
  console.error(`[worker] failed ${job?.name} ${job?.id}`, error)
})

async function shutdown() {
  await maintenanceWorker.close()
  connection.disconnect()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
