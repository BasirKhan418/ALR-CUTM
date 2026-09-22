import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { exportStatusLabel, yearStatusLabel } from "@/lib/domain/tiers"
import type { YearBoardRow, YearQueueRow } from "@/lib/tiers/types"

export function YearQueueTable({
  rows,
  empty,
}: {
  rows: YearQueueRow[]
  empty: string
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-card px-4 py-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
        {empty}
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Student</th>
            <th className="px-3 py-2 font-medium">Year</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Rubric</th>
            <th className="px-3 py-2 font-medium">PO/PSO</th>
            <th className="px-3 py-2 font-medium">CO</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border/70">
              <td className="px-3 py-2">
                <Link href={row.href} className="font-medium hover:underline">
                  {row.studentName}
                </Link>
              </td>
              <td className="px-3 py-2">{row.academicYear}</td>
              <td className="px-3 py-2">{yearStatusLabel(row.status)}</td>
              <td className="px-3 py-2">
                {row.rubricTotal === null ? "—" : `${row.rubricTotal} / 100`}
              </td>
              <td className="px-3 py-2">{row.mentorSigned ? "Signed" : "Missing"}</td>
              <td className="px-3 py-2">
                {row.coTotal === 0 ? "—" : `${row.coSigned} / ${row.coTotal}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function YearBoardTable({
  rows,
  hrefBase,
}: {
  rows: YearBoardRow[]
  hrefBase: string
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-card px-4 py-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
        No active students on this campus.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full min-w-[48rem] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Student</th>
            <th className="px-3 py-2 font-medium">Programme</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Rubric</th>
            <th className="px-3 py-2 font-medium">Credit</th>
            <th className="px-3 py-2 font-medium">Exam cell</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId} className="border-t border-border/70">
              <td className="px-3 py-2">
                {row.evaluationId ? (
                  <Link
                    href={`${hrefBase}/${row.evaluationId}`}
                    className="font-medium hover:underline"
                  >
                    {row.studentName}
                  </Link>
                ) : (
                  <span className="font-medium">{row.studentName}</span>
                )}
                {row.registrationNo ? (
                  <span className="block text-xs text-muted-foreground">
                    {row.registrationNo}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2">
                {row.programmeName}
                {row.durationYears ? (
                  <span className="block text-xs text-muted-foreground">
                    {row.durationYears} years
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2">
                {row.status ? (
                  <Badge variant="outline">{yearStatusLabel(row.status)}</Badge>
                ) : (
                  "Not opened"
                )}
              </td>
              <td className="px-3 py-2">
                {row.rubricTotal === null ? "—" : `${row.rubricTotal} / 100`}
              </td>
              <td className="px-3 py-2">{row.creditPosted ? "1 posted" : "—"}</td>
              <td className="px-3 py-2">{exportStatusLabel(row.exportStatus)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
