"use client"

import { useActionState, useState } from "react"
import { CircleAlertIcon } from "lucide-react"
import {
  upsertClassroomComponents,
  type ScoreFormState,
} from "@/lib/actions/scoring"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formulaSentence, type CourseRecordConfig } from "@/lib/domain/catalog"
import { CLASSROOM_COMPOSITE_DEFAULT } from "@/lib/domain/weights"
import { classroomTotal } from "@/lib/domain/scoring"
import type { ClassroomComponentsView } from "@/lib/scoring/types"

const INITIAL: ScoreFormState = { ok: false }

export function ClassroomScorePanel({
  courseId,
  config,
  students,
  rows,
}: {
  courseId: string
  config: CourseRecordConfig
  students: { id: string; name: string; email: string }[]
  rows: ClassroomComponentsView[]
}) {
  const weights = config.compositeWeights ?? CLASSROOM_COMPOSITE_DEFAULT
  const byStudent = new Map(rows.map((row) => [row.studentId, row]))

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">Classroom composites</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formulaSentence(config)} Marks cannot exceed this course split.
        </p>
      </div>
      {students.length === 0 ? (
        <div className="rounded-xl bg-card p-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
          Enroll students before entering classroom marks.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Assignment / {weights.assignment}</TableHead>
                <TableHead>Presentation / {weights.presentation}</TableHead>
                <TableHead>Mid-sem / {weights.midsem}</TableHead>
                <TableHead>Record / {weights.record}</TableHead>
                <TableHead>Total / 10</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <ClassroomRow
                  key={student.id}
                  courseId={courseId}
                  student={student}
                  row={byStudent.get(student.id)}
                  maxes={weights}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

function ClassroomRow({
  courseId,
  student,
  row,
  maxes,
}: {
  courseId: string
  student: { id: string; name: string; email: string }
  row?: ClassroomComponentsView
  maxes: { assignment: number; presentation: number; midsem: number; record: number }
}) {
  const [state, action] = useActionState(upsertClassroomComponents, INITIAL)
  const [values, setValues] = useState({
    assignment: numberText(row?.assignment),
    presentation: numberText(row?.presentation),
    midSem: numberText(row?.midSem),
    recordMark: numberText(row?.recordMark),
  })
  const preview = classroomTotal({
    assignment: Number(values.assignment || 0),
    presentation: Number(values.presentation || 0),
    midSem: Number(values.midSem || 0),
    recordMark: Number(values.recordMark || 0),
  })
  const hasMarks = Object.values(values).some((value) => value !== "")

  return (
    <TableRow>
      <TableCell className="align-top">
        <form id={`classroom-${student.id}`} action={action} className="hidden">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="studentId" value={student.id} />
        </form>
        <p className="font-medium">{student.name}</p>
        <p className="text-xs text-muted-foreground">{student.email}</p>
        {state.message ? (
          <p
            className={
              state.ok
                ? "mt-1 text-xs text-muted-foreground"
                : "mt-1 flex items-start gap-1 text-xs text-destructive"
            }
          >
            {state.ok ? null : <CircleAlertIcon className="mt-0.5 size-3 shrink-0" />}
            {state.message}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="align-top">
        <Input
          form={`classroom-${student.id}`}
          name="assignment"
          type="number"
          min={0}
          max={maxes.assignment}
          step="0.5"
          required
          value={values.assignment}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              assignment: event.target.value,
            }))
          }
          aria-label={`${student.name} assignment`}
        />
      </TableCell>
      <TableCell className="align-top">
        <Input
          form={`classroom-${student.id}`}
          name="presentation"
          type="number"
          min={0}
          max={maxes.presentation}
          step="0.5"
          required
          value={values.presentation}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              presentation: event.target.value,
            }))
          }
          aria-label={`${student.name} presentation`}
        />
      </TableCell>
      <TableCell className="align-top">
        <Input
          form={`classroom-${student.id}`}
          name="midSem"
          type="number"
          min={0}
          max={maxes.midsem}
          step="0.5"
          required
          value={values.midSem}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              midSem: event.target.value,
            }))
          }
          aria-label={`${student.name} mid-sem`}
        />
      </TableCell>
      <TableCell className="align-top">
        <Input
          form={`classroom-${student.id}`}
          name="recordMark"
          type="number"
          min={0}
          max={maxes.record}
          step="0.5"
          required
          value={values.recordMark}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              recordMark: event.target.value,
            }))
          }
          aria-label={`${student.name} record`}
        />
      </TableCell>
      <TableCell className="align-top font-medium">
        {hasMarks ? preview : "—"}
      </TableCell>
      <TableCell className="align-top">
        <SubmitButton form={`classroom-${student.id}`} size="sm" pendingLabel="Saving…">
          Save
        </SubmitButton>
      </TableCell>
    </TableRow>
  )
}

function numberText(value?: number) {
  return value === undefined || Number.isNaN(value) ? "" : String(value)
}
