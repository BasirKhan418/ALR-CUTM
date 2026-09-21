import { maintenanceQueue } from "@/lib/queue/queues"

async function enqueue() {
  const job = await maintenanceQueue().add("ping", {})
  console.log(`enqueued ping job ${job.id}`)
  await maintenanceQueue().close()
  process.exit(0)
}

enqueue().catch((error) => {
  console.error(error)
  process.exit(1)
})
