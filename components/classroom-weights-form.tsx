"use client"

import { useActionState } from "react"
import { CircleAlertIcon } from "lucide-react"
import {
  updateClassroomComposites,
  type CatalogFormState,
} from "@/lib/actions/catalog"
import { SubmitButton } from "@/components/submit-button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  CLASSROOM_COMPOSITE_KEYS,
  CLASSROOM_COMPOSITE_LABELS,
  type ClassroomCompositeWeights,
} from "@/lib/domain/weights"

const INITIAL: CatalogFormState = { ok: false }

export function ClassroomWeightsForm({
  defaults,
}: {
  defaults: ClassroomCompositeWeights
}) {
  const [state, action] = useActionState(updateClassroomComposites, INITIAL)

  return (
    <form action={action} className="max-w-lg">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          {CLASSROOM_COMPOSITE_KEYS.map((key) => (
            <Field key={key}>
              <FieldLabel htmlFor={key}>{CLASSROOM_COMPOSITE_LABELS[key]}</FieldLabel>
              <Input
                id={key}
                name={key}
                type="number"
                min="0"
                step="0.5"
                required
                defaultValue={defaults[key]}
              />
            </Field>
          ))}
        </div>
        <FieldDescription>
          Assignment, presentation, mid-sem, and record must sum to 10. New and
          existing Classroom Learning configs are updated.
        </FieldDescription>
        {state.message ? (
          state.ok ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : (
            <FieldError className="flex items-center gap-1.5">
              <CircleAlertIcon className="size-3.5" />
              {state.message}
            </FieldError>
          )
        ) : null}
        <SubmitButton pendingLabel="Saving…">Save split</SubmitButton>
      </FieldGroup>
    </form>
  )
}
