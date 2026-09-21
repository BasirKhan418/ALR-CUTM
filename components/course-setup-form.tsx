"use client"

import { useActionState, useMemo, useState } from "react"
import { CircleAlertIcon } from "lucide-react"
import { createCourse, type CatalogFormState } from "@/lib/actions/catalog"
import { CoursePreview } from "@/components/course-preview"
import { SubmitButton } from "@/components/submit-button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { buildRecordConfigs, deliveryModeFor } from "@/lib/domain/catalog"
import {
  COMBINATION_CODES,
  COMBINATION_LABELS,
  type CombinationCode,
} from "@/lib/domain/subject-map"
import type { ClassroomCompositeWeights } from "@/lib/domain/weights"

const INITIAL: CatalogFormState = { ok: false }

const selectClass =
  "h-8 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function CourseSetupForm({
  campuses,
  departments,
  programmes,
  terms,
  composites,
  defaultCampusId,
  lockCampus = false,
  returnTo,
}: {
  campuses: { id: string; name: string }[]
  departments: { id: string; campusId: string; name: string }[]
  programmes: {
    id: string
    campusId: string
    departmentId: string
    name: string
  }[]
  terms: { id: string; name: string; academicYear: string }[]
  composites: ClassroomCompositeWeights
  defaultCampusId?: string
  lockCampus?: boolean
  returnTo: string
}) {
  const [state, action] = useActionState(createCourse, INITIAL)
  const [campusId, setCampusId] = useState(defaultCampusId ?? campuses[0]?.id ?? "")
  const [departmentId, setDepartmentId] = useState("")
  const [combination, setCombination] = useState<CombinationCode>("THEORY")

  const campusDepartments = useMemo(
    () => departments.filter((item) => item.campusId === campusId),
    [departments, campusId]
  )
  const campusProgrammes = useMemo(
    () =>
      programmes.filter(
        (item) =>
          item.campusId === campusId &&
          (!departmentId || item.departmentId === departmentId)
      ),
    [programmes, campusId, departmentId]
  )
  const preview = useMemo(
    () => ({
      configs: buildRecordConfigs(combination, composites),
      deliveryMode: deliveryModeFor(combination),
    }),
    [combination, composites]
  )

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <input type="hidden" name="returnTo" value={returnTo} />
      <FieldGroup className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="campusId">Campus</FieldLabel>
            <select
              id="campusId"
              name="campusId"
              required
              disabled={lockCampus}
              className={selectClass}
              value={campusId}
              onChange={(event) => {
                setCampusId(event.target.value)
                setDepartmentId("")
              }}
            >
              <option value="" disabled>
                Select campus
              </option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
            {lockCampus ? <input type="hidden" name="campusId" value={campusId} /> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="termId">Term</FieldLabel>
            <select id="termId" name="termId" required className={selectClass} defaultValue="">
              <option value="" disabled>
                Select term
              </option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name} · {term.academicYear}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="departmentId">Department</FieldLabel>
            <select
              id="departmentId"
              name="departmentId"
              required
              className={selectClass}
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="" disabled>
                Select department
              </option>
              {campusDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="programmeId">Programme</FieldLabel>
            <select
              id="programmeId"
              name="programmeId"
              required
              className={selectClass}
              defaultValue=""
            >
              <option value="" disabled>
                Select programme
              </option>
              {campusProgrammes.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="code">Course code</FieldLabel>
            <Input id="code" name="code" required placeholder="CSE2101" />
          </Field>
          <Field>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input id="title" name="title" required placeholder="Data Structures" />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="combinationCode">Combination code</FieldLabel>
          <select
            id="combinationCode"
            name="combinationCode"
            required
            className={selectClass}
            value={combination}
            onChange={(event) =>
              setCombination(event.target.value as CombinationCode)
            }
          >
            {COMBINATION_CODES.map((code) => (
              <option key={code} value={code}>
                {COMBINATION_LABELS[code]}
              </option>
            ))}
          </select>
          <FieldDescription>
            Record types are derived from this code. You cannot pick them by hand.
          </FieldDescription>
        </Field>
        {state.message && !state.ok ? (
          <FieldError className="flex items-center gap-1.5">
            <CircleAlertIcon className="size-3.5" />
            {state.message}
          </FieldError>
        ) : null}
        <SubmitButton pendingLabel="Creating…">Create course</SubmitButton>
      </FieldGroup>
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="eyebrow">Live preview</p>
        <h2 className="mt-1 font-heading text-lg font-semibold">
          Normalization stays visible
        </h2>
        <div className="mt-4">
          <CoursePreview
            configs={preview.configs}
            deliveryMode={preview.deliveryMode}
          />
        </div>
      </div>
    </form>
  )
}
