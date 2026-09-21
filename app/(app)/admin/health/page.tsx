import { AdminHealthPanel } from "@/components/admin-health-panel"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { PlagiarismReport } from "@/lib/db/models/plagiarism-report"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"
import { plagiarismUsage } from "@/lib/plagiarism/rate-limit"
import { allQueues, QUEUE_NAMES } from "@/lib/queue/queues"
import { Suspense } from "react"

export default function AdminHealthPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  await connectMongo()
  const [usage, failedReports, queueCounts] = await Promise.all([
    plagiarismUsage(session.campusId),
    PlagiarismReport.countDocuments({ status: "FAILED" }),
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
        description="Valkey hourly plagiarism usage and BullMQ waiting or failed jobs."
      />
      <AdminHealthPanel
        usage={usage}
        failedReports={failedReports}
        queues={names.map((name, index) => ({
          name,
          waiting: queueCounts[index]?.waiting ?? 0,
          failed: queueCounts[index]?.failed ?? 0,
        }))}
      />
    </PageEnter>
  )
}
