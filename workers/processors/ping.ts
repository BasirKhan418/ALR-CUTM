import type { Job } from "bullmq"
import { AuditLog } from "@/lib/db/models/audit-log"
import { connectMongo } from "@/lib/db/mongo"
import { getValkey } from "@/lib/valkey"

export async function processPing(job: Job): Promise<{ ok: true; at: string }> {
  const payload = { ok: true as const, at: new Date().toISOString() }
  await getValkey().set(
    `job:progress:${job.id}`,
    JSON.stringify(payload),
    "EX",
    60 * 60
  )
  await connectMongo()
  await AuditLog.create({
    action: "maintenance.ping",
    payload: { jobId: job.id, ...payload },
  })
  return payload
}
