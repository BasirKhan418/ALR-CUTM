"use client"

import { useActionState } from "react"
import { CheckCircle2Icon, ChevronDownIcon, CircleAlertIcon } from "lucide-react"
import { createUser, type CreateUserState } from "@/lib/actions/users"
import { SubmitButton } from "@/components/submit-button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PROVISIONABLE_ROLES } from "@/lib/domain/roles"
import { roleLabel } from "@/lib/ui/format"

const INITIAL: CreateUserState = { ok: false }

export function CreateUserForm({
  campuses,
}: {
  campuses: { id: string; name: string }[]
}) {
  const [state, action] = useActionState(createUser, INITIAL)

  return (
    <form action={action} className="max-w-xl">
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              name="name"
              required
              autoComplete="name"
              className="h-9"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@cutm.ac.in"
              className="h-9"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="campusId">Campus</FieldLabel>
          <div className="relative">
            <select
              id="campusId"
              name="campusId"
              required
              className="h-9 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 pr-8 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select campus</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="registrationNo">
            Registration no.{" "}
            <span className="font-normal text-muted-foreground">optional</span>
          </FieldLabel>
          <Input id="registrationNo" name="registrationNo" className="h-9" />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Roles</legend>
          <div className="grid grid-cols-2 gap-2">
            {PROVISIONABLE_ROLES.map((role) => (
              <label
                key={role}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-sm transition-colors duration-150 hover:bg-muted/60 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/8"
              >
                <input
                  type="checkbox"
                  name="roles"
                  value={role}
                  className="size-3.5 accent-primary"
                />
                {roleLabel(role)}
              </label>
            ))}
          </div>
        </fieldset>
        {state.message ? (
          state.ok ? (
            <div className="flex items-start gap-2 rounded-lg border border-primary/15 bg-primary/6 px-3 py-2.5 text-sm animate-enter">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>{state.message}</p>
            </div>
          ) : (
            <FieldError className="flex items-center gap-1.5">
              <CircleAlertIcon className="size-3.5" />
              {state.message}
            </FieldError>
          )
        ) : null}
        <FieldDescription>
          They will sign in with email OTP or Google using this email. No
          password is created.
        </FieldDescription>
        <SubmitButton
          size="lg"
          className="h-9"
          pendingLabel="Creating user…"
        >
          Create user
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
