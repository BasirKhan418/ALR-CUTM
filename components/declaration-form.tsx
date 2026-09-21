"use client"

import { useActionState, useEffect, useState } from "react"
import { FileCheckIcon, ShieldCheckIcon } from "lucide-react"
import {
  acceptDeclaration,
  type DeclarationState,
} from "@/lib/actions/auth"
import { BrandMark } from "@/components/brand-mark"
import { SubmitButton } from "@/components/submit-button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { DECLARATION_TEXT, DECLARATION_VERSION } from "@/lib/domain/declaration"

const INITIAL: DeclarationState = { ok: false }

export function DeclarationForm() {
  const [accepted, setAccepted] = useState(false)
  const [state, action] = useActionState(acceptDeclaration, INITIAL)

  useEffect(() => {
    if (state.ok && state.next) {
      window.location.replace(state.next)
    }
  }, [state])

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-8 px-6 py-16">
      <div className="animate-enter">
        <BrandMark />
      </div>
      <div className="flex flex-col gap-3 animate-enter">
        <p className="eyebrow">First visit</p>
        <h1 className="font-heading text-3xl font-semibold">
          One-time e-declaration
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Read this once. Acceptance is stored on your account, so other
          devices will not ask again.
        </p>
      </div>
      <div className="animate-enter-late overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileCheckIcon className="size-4 text-primary" />
            Academic integrity
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {DECLARATION_VERSION}
          </span>
        </div>
        <div className="max-h-72 overflow-y-auto px-4 py-4 text-sm leading-7 text-card-foreground">
          {DECLARATION_TEXT.split("\n\n").map((para) => (
            <p key={para.slice(0, 24)} className="mb-4 last:mb-0">
              {para}
            </p>
          ))}
        </div>
      </div>
      <form action={action} className="animate-enter-late">
        <input type="hidden" name="accepted" value={accepted ? "on" : ""} />
        <FieldGroup>
          <Field orientation="horizontal" className="items-start">
            <Checkbox
              id="accepted"
              checked={accepted}
              onCheckedChange={(value) => setAccepted(value === true)}
            />
            <FieldLabel htmlFor="accepted" className="leading-5">
              I have read this declaration and accept it.
            </FieldLabel>
          </Field>
          {state.message ? <FieldError>{state.message}</FieldError> : null}
          <FieldDescription>
            Later visits and other browsers will not ask again unless an
            administrator resets it.
          </FieldDescription>
          <SubmitButton
            size="lg"
            className="h-10 w-full sm:w-auto"
            disabled={!accepted}
            pendingLabel={
              state.ok ? "Opening workspace…" : "Saving acceptance…"
            }
          >
            <ShieldCheckIcon data-icon="inline-start" />
            Accept and continue
          </SubmitButton>
        </FieldGroup>
      </form>
    </div>
  )
}
