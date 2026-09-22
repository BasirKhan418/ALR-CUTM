import { buttonVariants } from "@/components/ui/button"
import type { AnalyticsSnapshot } from "@/lib/services/analytics"
import { cn } from "@/lib/utils"

const selectClass =
  "h-8 w-full min-w-40 appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"

type Option = { id: string; name: string }

export function AnalyticsPanel({
  action,
  audience,
  snapshot,
  campuses,
  departments,
  terms,
  programmes,
  campus,
  department,
  term,
  programme,
  lockedCampusName,
}: {
  action: string
  audience: "ADMIN" | "DEAN" | "HOD"
  snapshot: AnalyticsSnapshot
  campuses: Option[]
  departments: Option[]
  terms: Option[]
  programmes: Option[]
  campus: string
  department: string
  term: string
  programme: string
  lockedCampusName?: string
}) {
  const max = Math.max(1, ...snapshot.submissions.map((row) => row.count))
  return (
    <div className="flex flex-col gap-6">
      <form method="get" action={action} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Campus</span>
          {audience === "HOD" ? (
            <p className="flex h-8 items-center text-sm">{lockedCampusName}</p>
          ) : (
            <select name="campus" defaultValue={campus} className={selectClass}>
              <option value="all">All</option>
              {campuses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </label>
        {audience === "HOD" ? null : (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Department</span>
            <select name="department" defaultValue={department} className={selectClass}>
              <option value="">All departments</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Term</span>
          <select name="term" defaultValue={term} className={selectClass}>
            <option value="">All terms</option>
            {terms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Programme</span>
          <select name="programme" defaultValue={programme} className={selectClass}>
            <option value="">All programmes</option>
            {programmes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "h-8")}>
          Apply
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card label="Average normalized score" value={snapshot.averageNormalized ?? "—"} />
        <Card label="Overdue sign-offs" value={snapshot.overdueSignoffs} />
        <Card label="Open plagiarism cases" value={snapshot.openCases} />
        <Card
          label="ALR credits posted / expected"
          value={`${snapshot.creditsPosted} / ${snapshot.creditsExpected}`}
        />
        <Card label="Workshop hours" value={snapshot.workshopHours} />
      </div>

      <section className="overflow-x-auto rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-lg font-semibold">Submissions by record type</h2>
        <table className="mt-3 w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Record</th>
              <th className="py-1 font-medium">Count</th>
              <th className="py-1 font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.submissions.map((row) => (
              <tr key={row.recordType} className="border-t border-foreground/10">
                <td className="py-2">{row.label}</td>
                <td className="py-2">{row.count}</td>
                <td className="py-2">
                  <div className="h-2 max-w-40 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-foreground"
                      style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
    </section>
  )
}
