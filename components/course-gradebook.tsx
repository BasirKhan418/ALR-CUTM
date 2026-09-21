import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formulaSentence, type CourseRecordConfig } from "@/lib/domain/catalog"
import { recordTypeLabel } from "@/lib/domain/record-types"
import { formatMarks } from "@/lib/scoring/format"
import type { GradebookRow } from "@/lib/scoring/types"

export function CourseGradebook({
  configs,
  rows,
}: {
  configs: CourseRecordConfig[]
  rows: GradebookRow[]
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">Gradebook</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Raw average is shown only as the input to the formula. The subject
          contribution is the normalized Framework mark.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {configs.map((config) => (
          <p key={config.recordType} className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {recordTypeLabel(config.recordType)}.
            </span>{" "}
            {formulaSentence(config)}
          </p>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl bg-card p-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No enrolled students yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                {configs.map((config) => (
                  <TableHead key={config.recordType}>
                    {recordTypeLabel(config.recordType)} · {config.frameworkWeightPercent}%
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.studentId}>
                  <TableCell>
                    <p className="font-medium">{row.studentName}</p>
                    <p className="text-xs text-muted-foreground">{row.studentEmail}</p>
                  </TableCell>
                  {row.cells.map((cell) => {
                    const pending = !cell.computedAt
                    return (
                      <TableCell key={cell.recordType} className="align-top">
                        {pending ? (
                          <Badge variant="outline">Not scored</Badge>
                        ) : (
                          <div className="flex flex-col gap-1 text-sm">
                            <p className="font-medium">
                              {formatMarks(cell.normalized)} / {cell.frameworkMarks}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Raw {formatMarks(cell.rawAverage)} / {cell.entryMax}
                            </p>
                            {cell.overrideReason ? (
                              <p className="text-xs">
                                Faculty override: {cell.overrideReason}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
