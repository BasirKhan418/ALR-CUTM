"use client"

import { useActionState } from "react"
import { CircleAlertIcon } from "lucide-react"
import { createTerm, type CatalogFormState } from "@/lib/actions/catalog"
import { SubmitButton } from "@/components/submit-button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const INITIAL: CatalogFormState = { ok: false }

export function TermForm({
  terms,
}: {
  terms: { id: string; name: string; academicYear: string }[]
}) {
  const [state, action] = useActionState(createTerm, INITIAL)

  return (
    <div className="flex flex-col gap-4">
      <form action={action}>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">Term name</FieldLabel>
              <Input id="name" name="name" required placeholder="Odd Semester 2026" />
            </Field>
            <Field>
              <FieldLabel htmlFor="academicYear">Academic year</FieldLabel>
              <Input
                id="academicYear"
                name="academicYear"
                required
                placeholder="2026-27"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="startsAt">Starts</FieldLabel>
              <Input id="startsAt" name="startsAt" type="date" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="endsAt">Ends</FieldLabel>
              <Input id="endsAt" name="endsAt" type="date" required />
            </Field>
          </div>
          <FieldDescription>
            Courses are unique by code + term. Add a term before course setup if
            the seed has not been run.
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
          <SubmitButton pendingLabel="Adding…">Add term</SubmitButton>
        </FieldGroup>
      </form>
      {terms.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-sm">
          {terms.map((term) => (
            <li key={term.id} className="text-muted-foreground">
              <span className="font-medium text-foreground">{term.name}</span>
              {" · "}
              {term.academicYear}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
