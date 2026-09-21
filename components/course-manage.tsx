"use client"

import { useActionState, useTransition } from "react"
import { toast } from "sonner"
import { CircleAlertIcon } from "lucide-react"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
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
  "h-8 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

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

  const faculty = staff.filter((item) => item.role === "FACULTY")
  const mentors = staff.filter((item) => item.role === "MENTOR")

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">
          {course.termName} · {course.academicYear}
        </p>
        <h1 className="font-heading text-3xl font-semibold">{course.title}</h1>
        <p className="text-sm text-muted-foreground">
          {course.code} · {course.departmentName} · {course.programmeName}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge>{combinationLabel(course.combinationCode)}</Badge>
          <Badge variant="outline">Delivery {course.deliveryMode}</Badge>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <form action={comboAction} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <input type="hidden" name="courseId" value={course.id} />
          <FieldGroup>
            <Field>
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
              <FieldDescription>
                Changing this rebuilds required records. Stale types are dropped.
              </FieldDescription>
            </Field>
            {comboState.message ? (
              comboState.ok ? (
                <p className="text-sm text-muted-foreground">{comboState.message}</p>
              ) : (
                <FieldError className="flex items-center gap-1.5">
                  <CircleAlertIcon className="size-3.5" />
                  {comboState.message}
                </FieldError>
              )
            ) : null}
            <SubmitButton pendingLabel="Rebuilding…">Update mapping</SubmitButton>
          </FieldGroup>
        </form>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="eyebrow">Derived records</p>
          <div className="mt-3">
            <CoursePreview
              configs={course.recordConfigs}
              deliveryMode={course.deliveryMode}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="eyebrow">Course faculty</p>
          <h2 className="mt-1 font-heading text-lg font-semibold">Subject faculty</h2>
          <form action={facultyAction} className="mt-4">
            <input type="hidden" name="courseId" value={course.id} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="facultyUserId">Assign faculty</FieldLabel>
                <select
                  id="facultyUserId"
                  name="userId"
                  required
                  className={selectClass}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select faculty
                  </option>
                  {facultyOptions.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </Field>
              {facultyState.message && !facultyState.ok ? (
                <FieldError>{facultyState.message}</FieldError>
              ) : null}
              <SubmitButton pendingLabel="Assigning…">Assign faculty</SubmitButton>
            </FieldGroup>
          </form>
          <StaffTable
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
        </div>

        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="eyebrow">PO / PSO</p>
          <h2 className="mt-1 font-heading text-lg font-semibold">Mentor</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mentor is assigned separately from Faculty, even if it is the same person.
          </p>
          <form action={mentorAction} className="mt-4">
            <input type="hidden" name="courseId" value={course.id} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="mentorUserId">Assign mentor</FieldLabel>
                <select
                  id="mentorUserId"
                  name="userId"
                  required
                  className={selectClass}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select mentor
                  </option>
                  {mentorOptions.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </Field>
              {mentorState.message && !mentorState.ok ? (
                <FieldError>{mentorState.message}</FieldError>
              ) : null}
              <SubmitButton pendingLabel="Assigning…">Assign mentor</SubmitButton>
            </FieldGroup>
          </form>
          <StaffTable
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
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="eyebrow">Enrollment</p>
        <h2 className="mt-1 font-heading text-lg font-semibold">Students</h2>
        <form action={enrollAction} className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <input type="hidden" name="courseId" value={course.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="emails">Paste emails</FieldLabel>
              <textarea
                id="emails"
                name="emails"
                rows={5}
                placeholder={"student.bbsr@cutm.ac.in\nname@cutm.ac.in"}
                className="min-h-28 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <FieldDescription>
                One email per line, or comma-separated. Only campus students are added.
              </FieldDescription>
            </Field>
            {enrollState.message ? (
              enrollState.ok ? (
                <p className="text-sm text-muted-foreground">{enrollState.message}</p>
              ) : (
                <FieldError>{enrollState.message}</FieldError>
              )
            ) : null}
            <SubmitButton pendingLabel="Enrolling…">Enroll students</SubmitButton>
          </FieldGroup>
          <fieldset className="max-h-64 overflow-auto rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-medium">Or select</legend>
            <div className="flex flex-col gap-1.5">
              {studentOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students on this campus.</p>
              ) : (
                studentOptions.map((student) => (
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
                      <span className="block text-xs text-muted-foreground">
                        {student.email}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </fieldset>
        </form>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolled.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No students enrolled yet.
                  </TableCell>
                </TableRow>
              ) : (
                enrolled.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
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

function StaffTable({
  rows,
  empty,
  pending,
  onRemove,
}: {
  rows: { id: string; name: string; email: string }[]
  empty: string
  pending: boolean
  onRemove: (id: string) => void
}) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.name}</p>
            <p className="truncate text-xs text-muted-foreground">{row.email}</p>
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
  )
}
