import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CatalogCourse } from "@/lib/catalog/queries"
import { recordTypeLabel } from "@/lib/domain/record-types"
import { combinationLabel } from "@/lib/domain/subject-map"

export function CourseTable({
  courses,
  hrefFor,
  empty,
}: {
  courses: CatalogCourse[]
  hrefFor?: (course: CatalogCourse) => string
  empty: string
}) {
  if (courses.length === 0) {
    return (
      <div className="rounded-xl bg-card p-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
        {empty}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Combination</TableHead>
            <TableHead>Required records</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.id}>
              <TableCell>
                {hrefFor ? (
                  <Link
                    href={hrefFor(course)}
                    className="font-medium hover:underline"
                  >
                    {course.code}
                  </Link>
                ) : (
                  <p className="font-medium">{course.code}</p>
                )}
                <p className="text-xs text-muted-foreground">{course.title}</p>
              </TableCell>
              <TableCell>
                {course.termName}
                <p className="text-xs text-muted-foreground">
                  {course.academicYear}
                </p>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {combinationLabel(course.combinationCode)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {course.recordConfigs.map((config) => (
                    <Badge key={config.recordType} variant="secondary">
                      {recordTypeLabel(config.recordType)} {config.frameworkWeightPercent}%
                    </Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
