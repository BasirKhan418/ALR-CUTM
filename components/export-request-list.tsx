import type { ExportRequestRow } from "@/lib/exports/queries"

export function ExportRequestList({ rows }: { rows: ExportRequestRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No export jobs yet.</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-sm"
        >
          <div>
            <p className="font-medium">
              {row.kind === "WORKSHOP" ? "Workshop certificate" : "Learning Record"}
              {row.scope === "PROGRAM"
                ? " · Full programme"
                : row.academicYear
                  ? ` · ${row.academicYear}`
                  : ""}
            </p>
            <p className="text-muted-foreground">
              {row.status}
              {row.error ? ` · ${row.error}` : ""}
            </p>
          </div>
          {row.downloadHref ? (
            <a href={row.downloadHref} className="font-medium underline">
              Download PDF
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
