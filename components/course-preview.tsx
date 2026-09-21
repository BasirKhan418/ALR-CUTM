import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  exampleNormalization,
  formulaSentence,
  type CourseRecordConfig,
} from "@/lib/domain/catalog"
import { recordTypeLabel } from "@/lib/domain/record-types"

export function CoursePreview({
  configs,
  deliveryMode,
}: {
  configs: CourseRecordConfig[]
  deliveryMode?: string
}) {
  if (configs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Choose a combination code to see required records.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium">This subject requires:</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {configs.map((config) => (
            <Badge key={config.recordType} variant="outline">
              {recordTypeLabel(config.recordType)} · {config.frameworkWeightPercent}%
            </Badge>
          ))}
          {deliveryMode ? (
            <Badge variant="secondary">Delivery {deliveryMode}</Badge>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record</TableHead>
              <TableHead>Entry max</TableHead>
              <TableHead>Framework</TableHead>
              <TableHead>Weight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.recordType}>
                <TableCell className="font-medium">
                  {recordTypeLabel(config.recordType)}
                </TableCell>
                <TableCell>{config.entryMax}</TableCell>
                <TableCell>{config.frameworkMarks}</TableCell>
                <TableCell>{config.frameworkWeightPercent}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
        {configs.map((config) => {
          const example = exampleNormalization(config)
          return (
            <li key={config.recordType}>
              <span className="font-medium text-foreground">
                {recordTypeLabel(config.recordType)}.
              </span>{" "}
              {formulaSentence(config)} {example.caption}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
