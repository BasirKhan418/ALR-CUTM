import mongoose from "mongoose"
import { connection } from "next/server"
import { AdminHealthPanel } from "@/components/admin-health-panel"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { ExportRequest } from "@/lib/db/models/export-request"
import { PlagiarismReport } from "@/lib/db/models/plagiarism-report"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"
import { readPlagiarismWarnPercent } from "@/lib/catalog/settings"
import { plagiarismUsage } from "@/lib/plagiarism/rate-limit"
import { allQueues, QUEUE_NAMES } from "@/lib/queue/queues"
import { getValkey } from "@/lib/valkey"
import { Suspense } from "react"

export default function AdminHealthPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  await connection()
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  await connectMongo()
  let mongo: "ok" | "error" = "error"
  let valkey: "ok" | "error" = "error"
  try {
    await mongoose.connection.db!.admin().ping()
    mongo = "ok"
  } catch {
    mongo = "error"
  }
  try {
    valkey = (await getValkey().ping()) === "PONG" ? "ok" : "error"
  } catch {
    valkey = "error"
  }
  const [usage, warnPercent, failedReports, bookletQueued, bookletReady, queueCounts] = await Promise.all([
    plagiarismUsage(session.campusId),
    readPlagiarismWarnPercent(),
    PlagiarismReport.countDocuments({ status: "FAILED" }),
    ExportRequest.countDocuments({ kind: "BOOKLET", status: "QUEUED" }),
    ExportRequest.countDocuments({ kind: "BOOKLET", status: "READY" }),
    Promise.all(
      allQueues().map(async (queue) => ({
        waiting: await queue.getWaitingCount(),
        failed: await queue.getFailedCount(),
      }))
    ),
  ])
  const names = Object.values(QUEUE_NAMES)
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Health"
        description="Valkey hourly plagiarism usage, booklet jobs, and BullMQ waiting or failed jobs."
      />
      <AdminHealthPanel
        usage={usage}
        warnPercent={warnPercent}
        failedReports={failedReports}
        pings={{ mongo, valkey }}
        booklet={{ queued: bookletQueued, ready: bookletReady }}
        queues={names.map((name, index) => ({
          name,
          waiting: queueCounts[index]?.waiting ?? 0,
          failed: queueCounts[index]?.failed ?? 0,
        }))}
      />
    </PageEnter>
  )
}
