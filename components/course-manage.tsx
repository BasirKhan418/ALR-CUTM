"use client"

import { useActionState, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { CircleAlertIcon, SearchIcon } from "lucide-react"
import {
  assignFaculty,
  assignMentor,
  enrollStudents,
  unassignStaff,
  unenrollStudent,
  updateCourseCombination,
  type CatalogFormState,
} from "@/lib/actions/catalog"
import { CoursePreview } from "@/components/course-preview"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ManageCourse } from "@/lib/catalog/types"
import {
  COMBINATION_CODES,
  COMBINATION_LABELS,
  combinationLabel,
} from "@/lib/domain/subject-map"

const INITIAL: CatalogFormState = { ok: false }
const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function CourseManage({
  course,
  staff,
  enrolled,
  facultyOptions,
  mentorOptions,
  studentOptions,
}: {
  course: ManageCourse
  staff: { id: string; userId: string; name: string; email: string; role: "FACULTY" | "MENTOR" }[]
  enrolled: { id: string; name: string; email: string }[]
  facultyOptions: { id: string; name: string }[]
  mentorOptions: { id: string; name: string }[]
  studentOptions: { id: string; name: string; email: string }[]
}) {
  const [comboState, comboAction] = useActionState(
    updateCourseCombination,
    INITIAL
  )
  const [enrollState, enrollAction] = useActionState(enrollStudents, INITIAL)
  const [facultyState, facultyAction] = useActionState(assignFaculty, INITIAL)
  const [mentorState, mentorAction] = useActionState(assignMentor, INITIAL)
  const [pending, startTransition] = useTransition()
  const [studentQuery, setStudentQuery] = useState("")

  const faculty = staff.filter((item) => item.role === "FACULTY")
  const mentors = staff.filter((item) => item.role === "MENTOR")
  const needle = studentQuery.trim().toLowerCase()
  const enrolledIds = useMemo(
    () => new Set(enrolled.map((student) => student.id)),
    [enrolled]
  )
  const availableStudents = useMemo(
    () => studentOptions.filter((student) => !enrolledIds.has(student.id)),
    [enrolledIds, studentOptions]
  )
  const matchingStudents = useMemo(
    () =>
      availableStudents.filter((student) => {
        if (!needle) return true
        return `${student.name} ${student.email}`.toLowerCase().includes(needle)
      }),
    [availableStudents, needle]
  )

  function mutate(
    action: () => Promise<CatalogFormState>,
    fallback: string
  ) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) toast.success(result.message ?? fallback)
      else toast.error(result.message ?? "That change could not be saved.")
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {course.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {course.code} · {course.termName} · {course.academicYear}
          </p>
          <p className="text-sm text-muted-foreground">
            {course.departmentName} · {course.programmeName}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge>{combinationLabel(course.combinationCode)}</Badge>
          <Badge variant="outline">Delivery {course.deliveryMode}</Badge>
          <Badge variant="secondary">{enrolled.length} enrolled</Badge>
        </div>
      </div>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">Mapping</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Combination code rebuilds required records. Stale types are dropped.
            </p>
          </div>
        </div>
        <form
          action={comboAction}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="courseId" value={course.id} />
          <Field className="min-w-0 flex-1 sm:max-w-sm">
            <FieldLabel htmlFor="combinationCode">Combination code</FieldLabel>
            <select
              id="combinationCode"
              name="combinationCode"
              required
              className={selectClass}
              defaultValue={course.combinationCode}
            >
              {COMBINATION_CODES.map((code) => (
                <option key={code} value={code}>
                  {COMBINATION_LABELS[code]}
                </option>
              ))}
            </select>
          </Field>
          <SubmitButton pendingLabel="Rebuilding…" className="w-fit shrink-0">
            Update mapping
          </SubmitButton>
        </form>
        {comboState.message ? (
          comboState.ok ? (
            <p className="mt-3 text-sm text-muted-foreground">{comboState.message}</p>
          ) : (
            <FieldError className="mt-3 flex items-center gap-1.5">
              <CircleAlertIcon className="size-3.5" />
              {comboState.message}
            </FieldError>
          )
        ) : null}
        <div className="mt-5 border-t border-border pt-4">
          <CoursePreview
            configs={course.recordConfigs}
            deliveryMode={course.deliveryMode}
            compact
          />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <AssignCard
          eyebrow="Course faculty"
          title="Subject faculty"
          description="People who teach this subject."
          action={facultyAction}
          courseId={course.id}
          selectId="facultyUserId"
          options={facultyOptions.filter(
            (person) => !faculty.some((row) => row.userId === person.id)
          )}
          emptyOption="Select faculty"
          pendingLabel="Assigning…"
          submitLabel="Assign"
          error={facultyState.ok ? undefined : facultyState.message}
          rows={faculty}
          empty="No faculty assigned yet."
          pending={pending}
          onRemove={(assignmentId) =>
            mutate(
              () => unassignStaff(course.id, assignmentId),
              "Faculty removed."
            )
          }
        />
        <AssignCard
          eyebrow="PO / PSO"
          title="Mentor"
          description="Assigned separately from faculty, even if it is the same person."
          action={mentorAction}
          courseId={course.id}
          selectId="mentorUserId"
          options={mentorOptions.filter(
            (person) => !mentors.some((row) => row.userId === person.id)
          )}
          emptyOption="Select mentor"
          pendingLabel="Assigning…"
          submitLabel="Assign"
          error={mentorState.ok ? undefined : mentorState.message}
          rows={mentors}
          empty="No PO/PSO mentor assigned."
          pending={pending}
          onRemove={(assignmentId) =>
            mutate(
              () => unassignStaff(course.id, assignmentId),
              "Mentor removed."
            )
          }
        />
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <div>
          <h2 className="font-heading text-lg font-semibold">Enrollment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste emails or pick campus students. Only this campus is added.
          </p>
        </div>

        <form action={enrollAction} className="mt-4">
          <input type="hidden" name="courseId" value={course.id} />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4">
              <Field>
                <FieldLabel htmlFor="emails">Paste emails</FieldLabel>
                <textarea
                  id="emails"
                  name="emails"
                  rows={8}
                  placeholder={"student.bbsr@cutm.ac.in\nname@cutm.ac.in"}
                  className="min-h-40 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <FieldDescription>
                  One email per line, or comma-separated.
                </FieldDescription>
              </Field>
              <SubmitButton pendingLabel="Enrolling…" className="w-fit">
                Enroll students
              </SubmitButton>
            </div>
            <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <FieldLabel>Select students</FieldLabel>
                <div className="relative w-full sm:max-w-56">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={studentQuery}
                    onChange={(event) => setStudentQuery(event.target.value)}
                    placeholder="Search students"
                    aria-label="Search students"
                    className="h-9 pl-8"
                  />
                </div>
              </div>
              <div className="max-h-48 min-h-40 overflow-auto rounded-lg border border-border bg-background p-2">
                {availableStudents.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    {studentOptions.length === 0
                      ? "No students on this campus."
                      : "Everyone on this campus is already enrolled."}
                  </p>
                ) : matchingStudents.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    No students match that search.
                  </p>
                ) : (
                  matchingStudents.map((student) => (
                    <label
                      key={student.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60"
                    >
                      <input
                        type="checkbox"
                        name="studentIds"
                        value={student.id}
                        className="size-3.5 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{student.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {student.email}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {enrollState.message ? (
                  enrollState.ok ? (
                    <p className="text-sm text-muted-foreground">
                      {enrollState.message}
                    </p>
                  ) : (
                    <FieldError>{enrollState.message}</FieldError>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Enrolls pasted emails and checked names together.
                  </p>
                )}
                <SubmitButton pendingLabel="Enrolling…" className="w-fit shrink-0">
                  Enroll students
                </SubmitButton>
              </div>
            </div>
          </div>
        </form>

        <div className="mt-5 overflow-x-auto rounded-lg ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Student</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-24 pr-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolled.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="pl-4 text-muted-foreground">
                    No students enrolled yet.
                  </TableCell>
                </TableRow>
              ) : (
                enrolled.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="pl-4 font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell className="pr-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          mutate(
                            () => unenrollStudent(course.id, student.id),
                            "Student removed."
                          )
                        }
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

function AssignCard({
  eyebrow,
  title,
  description,
  action,
  courseId,
  selectId,
  options,
  emptyOption,
  pendingLabel,
  submitLabel,
  error,
  rows,
  empty,
  pending,
  onRemove,
}: {
  eyebrow: string
  title: string
  description: string
  action: (formData: FormData) => void
  courseId: string
  selectId: string
  options: { id: string; name: string }[]
  emptyOption: string
  pendingLabel: string
  submitLabel: string
  error?: string
  rows: { id: string; name: string; email: string }[]
  empty: string
  pending: boolean
  onRemove: (id: string) => void
}) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 font-heading text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <form
        action={action}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="courseId" value={courseId} />
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor={selectId}>{submitLabel}</FieldLabel>
          <select
            id={selectId}
            name="userId"
            required
            className={selectClass}
            defaultValue=""
          >
            <option value="" disabled>
              {emptyOption}
            </option>
            {options.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </Field>
        <SubmitButton pendingLabel={pendingLabel} className="w-fit shrink-0">
          {submitLabel}
        </SubmitButton>
      </form>
      {error ? <FieldError className="mt-2">{error}</FieldError> : null}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.email}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => onRemove(row.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
