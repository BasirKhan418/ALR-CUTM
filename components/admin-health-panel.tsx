export function AdminHealthPanel({
  usage,
  failedReports,
  queues,
}: {
  usage: { used: number; cap: number; percent: number }
  failedReports: number
  queues: { name: string; waiting: number; failed: number }[]
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div>
        <h2 className="font-heading text-lg font-semibold">Integrity health</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hourly Valkey usage against the campus cap, plus BullMQ waiting and
          failed counts.
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between text-sm">
          <span>Hourly plagiarism usage</span>
          <span className="font-medium">
            {usage.used} / {usage.cap} ({usage.percent}%)
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-foreground"
            style={{ width: `${Math.min(usage.percent, 100)}%` }}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Failed reports: {failedReports}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {queues.map((queue) => (
          <li
            key={queue.name}
            className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm"
          >
            <p className="font-medium">{queue.name}</p>
            <p className="text-muted-foreground">
              Waiting {queue.waiting} · Failed {queue.failed}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
