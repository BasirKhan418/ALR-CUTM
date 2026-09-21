"use client"

import { useActionState } from "react"
import { CircleAlertIcon } from "lucide-react"
import {
  savePlagiarismSettings,
  type PlagiarismFormState,
} from "@/lib/actions/plagiarism"
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
  documentTypeLabel,
  PLAGIARISM_DOCUMENT_TYPES,
  type PlagiarismDocumentType,
} from "@/lib/domain/plagiarism"

const INITIAL: PlagiarismFormState = { ok: false }

export function PlagiarismSettingsForm({
  thresholds,
  hourlyCap,
}: {
  thresholds: Record<PlagiarismDocumentType, number>
  hourlyCap: number
}) {
  const [state, action] = useActionState(savePlagiarismSettings, INITIAL)
  return (
    <form action={action} className="max-w-xl">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          {PLAGIARISM_DOCUMENT_TYPES.map((type) => (
            <Field key={type}>
              <FieldLabel htmlFor={type}>{documentTypeLabel(type)}</FieldLabel>
              <Input
                id={type}
                name={type}
                type="number"
                min={0}
                max={100}
                step="1"
                required
                defaultValue={thresholds[type]}
              />
            </Field>
          ))}
          <Field>
            <FieldLabel htmlFor="hourlyCap">Hourly campus cap</FieldLabel>
            <Input
              id="hourlyCap"
              name="hourlyCap"
              type="number"
              min={1}
              step="1"
              required
              defaultValue={hourlyCap}
            />
          </Field>
        </div>
        <FieldDescription>
          Thesis seeds at 20. Programming uses the code engine. Over-cap jobs
          delay and retry.
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
        <SubmitButton pendingLabel="Saving…">Save integrity settings</SubmitButton>
      </FieldGroup>
    </form>
  )
}
