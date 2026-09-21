"use client"

import { useActionState, useEffect } from "react"
import { CircleAlertIcon } from "lucide-react"
import { createUser, type CreateUserState } from "@/lib/actions/users"
import { SubmitButton } from "@/components/submit-button"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
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
  onSuccess,
}: {
  campuses: { id: string; name: string }[]
  onSuccess?: (message: string) => void
}) {
  const [state, action] = useActionState(createUser, INITIAL)

  useEffect(() => {
    if (state.ok && state.message) {
      onSuccess?.(state.message)
    }
  }, [state, onSuccess])

  return (
    <form action={action}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              name="name"
              required
              autoComplete="name"
              placeholder="Full name"
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
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="campusId">Campus</FieldLabel>
            <select
              id="campusId"
              name="campusId"
              required
              defaultValue=""
              className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
          </Field>
          <Field>
            <FieldLabel htmlFor="registrationNo">
              Registration no.{" "}
              <span className="font-normal text-muted-foreground">
                optional
              </span>
            </FieldLabel>
            <Input
              id="registrationNo"
              name="registrationNo"
              placeholder="If they have one"
            />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Roles</legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {PROVISIONABLE_ROLES.map((role) => (
              <label
                key={role}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm transition-colors duration-150 hover:bg-muted/60 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/8"
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
        {state.message && !state.ok ? (
          <FieldError className="flex items-center gap-1.5">
            <CircleAlertIcon className="size-3.5" />
            {state.message}
          </FieldError>
        ) : null}
        <FieldDescription>
          They sign in with email OTP or Google. No password is created.
        </FieldDescription>
        <DialogFooter>
          <DialogClose
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Cancel
          </DialogClose>
          <SubmitButton pendingLabel="Adding…">Add person</SubmitButton>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}
