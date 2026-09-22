"use client"

import { useActionState } from "react"
import { CircleAlertIcon } from "lucide-react"
import {
  requestLearningRecord,
  requestWorkshopCertificate,
  type ExportFormState,
} from "@/lib/actions/exports"
import { SubmitButton } from "@/components/submit-button"
import { FieldError } from "@/components/ui/field"

const INITIAL: ExportFormState = { ok: false }

const selectClass =
  "h-8 w-full min-w-40 appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"

function Note({ state }: { state: ExportFormState }) {
  if (!state.message) return null
  if (state.ok) return <p className="text-sm text-muted-foreground">{state.message}</p>
  return (
    <FieldError className="flex items-center gap-1.5">
      <CircleAlertIcon className="size-3.5" />
      {state.message}
    </FieldError>
  )
}

export function BookletRequestForm({
  years,
  students,
}: {
  years: string[]
  students?: { id: string; name: string }[]
}) {
  const [state, action] = useActionState(requestLearningRecord, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold">Learning Record booklet</h2>
      {students ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Student</span>
          <select name="studentId" required className={selectClass} defaultValue="">
            <option value="" disabled>
              Choose a student
            </option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Scope</span>
        <select name="scope" defaultValue="YEAR" className={selectClass}>
          <option value="YEAR">One academic year</option>
          <option value="PROGRAM">Full programme</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Academic year</span>
        <select name="academicYear" className={selectClass} defaultValue={years.at(-1) ?? ""}>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton>Request booklet</SubmitButton>
      <Note state={state} />
    </form>
  )
}

export function WorkshopRequestForm({
  courses,
  students,
}: {
  courses: { id: string; name: string }[]
  students?: { id: string; name: string }[]
}) {
  const [state, action] = useActionState(requestWorkshopCertificate, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold">Workshop hours certificate</h2>
      {students ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Student</span>
          <select name="studentId" required className={selectClass} defaultValue="">
            <option value="" disabled>
              Choose a student
            </option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Course</span>
        <select name="courseId" required className={selectClass} defaultValue="">
          <option value="" disabled>
            Choose a course
          </option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton>Request certificate</SubmitButton>
      <Note state={state} />
    </form>
  )
}
