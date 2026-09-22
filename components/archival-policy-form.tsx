"use client"

import { useActionState } from "react"
import { CircleAlertIcon } from "lucide-react"
import { saveArchivalPolicy, type PlagiarismFormState } from "@/lib/actions/plagiarism"
import { SubmitButton } from "@/components/submit-button"
import { FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { ARCHIVAL_POLICIES, archivalSentence, type ArchivalPolicy } from "@/lib/domain/archival"

const INITIAL: PlagiarismFormState = { ok: false }
const selectClass =
  "h-8 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function ArchivalPolicyForm({ policy }: { policy: ArchivalPolicy }) {
  const [state, action] = useActionState(saveArchivalPolicy, INITIAL)
  return (
    <form action={action} className="max-w-xl">
      <FieldGroup>
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="policy">Digital copy</FieldLabel>
          <select id="policy" name="policy" defaultValue={policy} className={selectClass}>
            {ARCHIVAL_POLICIES.map((item) => (
              <option key={item} value={item}>
                {item === "AUTHORITATIVE" ? "Authoritative copy" : "Working copy beside the hardbound booklet"}
              </option>
            ))}
          </select>
          <FieldDescription>{archivalSentence(policy)}</FieldDescription>
        </div>
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
        <SubmitButton pendingLabel="Saving…">Save archival policy</SubmitButton>
      </FieldGroup>
    </form>
  )
}
