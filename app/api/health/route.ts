import mongoose from "mongoose"
import { connection } from "next/server"
import { ExportRequest } from "@/lib/db/models/export-request"
import { PlagiarismReport } from "@/lib/db/models/plagiarism-report"
import { connectMongo } from "@/lib/db/mongo"
import { withTimeout } from "@/lib/health"
import { allQueues, QUEUE_NAMES } from "@/lib/queue/queues"
import { getValkey } from "@/lib/valkey"

const PING_MS = 2000

export async function GET() {
  await connection()

  let mongo: "ok" | "error" = "error"
  let valkey: "ok" | "error" = "error"
  const queues: Record<string, number> = Object.fromEntries(
    Object.values(QUEUE_NAMES).map((name) => [name, -1])
  )
  const queueFailed: Record<string, number> = Object.fromEntries(
    Object.values(QUEUE_NAMES).map((name) => [name, -1])
  )
  let failedReports = 0
  let plagiarismUsed = 0
  let plagiarismCap = 0
  let plagiarismPercent = 0
  let bookletQueued = 0
  let bookletReady = 0

  try {
    await withTimeout(connectMongo(), PING_MS, "mongo")
    await withTimeout(
      mongoose.connection.db!.admin().ping(),
      PING_MS,
      "mongo-ping"
    )
    failedReports = await PlagiarismReport.countDocuments({ status: "FAILED" })
    ;[bookletQueued, bookletReady] = await Promise.all([
      ExportRequest.countDocuments({ kind: "BOOKLET", status: "QUEUED" }),
      ExportRequest.countDocuments({ kind: "BOOKLET", status: "READY" }),
    ])
    mongo = "ok"
  } catch {
    mongo = "error"
  }

  try {
    const pong = await withTimeout(getValkey().ping(), PING_MS, "valkey")
    if (pong === "PONG") {
      valkey = "ok"
    }
  } catch {
    valkey = "error"
  }

  if (valkey === "ok") {
    try {
      const names = Object.values(QUEUE_NAMES)
      const counts = await withTimeout(
        Promise.all(
          allQueues().map(async (queue) => ({
            waiting: await queue.getWaitingCount(),
            failed: await queue.getFailedCount(),
          }))
        ),
        PING_MS,
        "queues"
      )
      names.forEach((name, index) => {
        queues[name] = counts[index]?.waiting ?? 0
        queueFailed[name] = counts[index]?.failed ?? 0
      })
      const keys = await getValkey().keys("rl:plagiarism:*")
      if (keys.length > 0) {
        const usedValues = await Promise.all(keys.map((key) => getValkey().get(key)))
        plagiarismUsed = usedValues.reduce((sum, value) => sum + Number(value ?? 0), 0)
      }
      const { readPlagiarismHourlyCap } = await import("@/lib/catalog/settings")
      plagiarismCap = await readPlagiarismHourlyCap()
      plagiarismPercent =
        plagiarismCap > 0
          ? Math.round((Math.min(plagiarismUsed, plagiarismCap) / plagiarismCap) * 100)
          : 0
    } catch {
      // leave queue counts at -1
    }
  }

  const ok = mongo === "ok" && valkey === "ok"
  return Response.json(
    {
      ok,
      mongo,
      valkey,
      queues,
      queueFailed,
      plagiarism: {
        used: plagiarismUsed,
        cap: plagiarismCap,
        percent: plagiarismPercent,
        failedReports,
      },
      booklet: {
        queued: bookletQueued,
        ready: bookletReady,
      },
    },
    { status: ok ? 200 : 503 }
  )
}
