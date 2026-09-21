"use client"

import { useActionState } from "react"
import { saveIndustryFeedback, type IndustryFormState } from "@/lib/actions/industry"
import { SubmitButton } from "@/components/submit-button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { INTERNSHIP_FORMULA_TEXT } from "@/lib/domain/internship"

const INITIAL: IndustryFormState = { ok: false }

export function IndustryForm({
  token,
  attendance,
  stipend,
  taskCompletion,
  feedback,
  externalScore,
  alreadySaved,
}: {
  token: string
  attendance: string
  stipend: string
  taskCompletion: string
  feedback: string
  externalScore: number | null
  alreadySaved: boolean
}) {
  const [state, action] = useActionState(saveIndustryFeedback, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-muted-foreground">{INTERNSHIP_FORMULA_TEXT}</p>
      <Field>
        <FieldLabel htmlFor="attendance">Attendance</FieldLabel>
        <Input
          id="attendance"
          name="attendance"
          required
          defaultValue={attendance}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="stipend">Stipend</FieldLabel>
        <Input id="stipend" name="stipend" required defaultValue={stipend} />
      </Field>
      <Field>
        <FieldLabel htmlFor="taskCompletion">Task completion</FieldLabel>
        <Textarea
          id="taskCompletion"
          name="taskCompletion"
          rows={3}
          className="min-h-20"
          required
          defaultValue={taskCompletion}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="feedback">Feedback</FieldLabel>
        <Textarea
          id="feedback"
          name="feedback"
          rows={3}
          className="min-h-20"
          required
          defaultValue={feedback}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="externalScore">External score / 50</FieldLabel>
        <Input
          id="externalScore"
          name="externalScore"
          type="number"
          min={0}
          max={50}
          step="0.5"
          required
          defaultValue={externalScore ?? ""}
        />
      </Field>
      {state.message ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : alreadySaved ? (
        <p className="text-sm text-muted-foreground">
          A score is already on file. Saving again replaces it.
        </p>
      ) : null}
      <SubmitButton pendingLabel="Saving…">Save industry report</SubmitButton>
    </form>
  )
}
