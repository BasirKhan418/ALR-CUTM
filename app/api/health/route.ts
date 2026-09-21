import mongoose from "mongoose"
import { connection } from "next/server"
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

  try {
    await withTimeout(connectMongo(), PING_MS, "mongo")
    await withTimeout(
      mongoose.connection.db!.admin().ping(),
      PING_MS,
      "mongo-ping"
    )
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
        Promise.all(allQueues().map((queue) => queue.getWaitingCount())),
        PING_MS,
        "queues"
      )
      names.forEach((name, index) => {
        queues[name] = counts[index] ?? 0
      })
    } catch {
      // leave queue counts at -1
    }
  }

  const ok = mongo === "ok" && valkey === "ok"
  return Response.json(
    { ok, mongo, valkey, queues },
    { status: ok ? 200 : 503 }
  )
}
