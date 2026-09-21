"use client"

import { useActionState } from "react"
import Link from "next/link"
import { upsertCoAttainment, type DeliverableFormState } from "@/lib/actions/deliverable"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { deliverableLabel, deliverableStatusLabel } from "@/lib/domain/deliverable"
import type { DeliverableView } from "@/lib/deliverable/types"

const INITIAL: DeliverableFormState = { ok: false }

export function FacultyDeliverableCard({
  deliverable,
}: {
  deliverable: DeliverableView
}) {
  const [state, action] = useActionState(upsertCoAttainment, INITIAL)
  const rows =
    deliverable.coAttainment.length > 0
      ? deliverable.coAttainment
      : [{ code: "", statement: "", level: "", remarks: "" }]

  return (
    <article className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{deliverableLabel(deliverable.type)}</p>
          <h3 className="mt-1 font-heading text-lg font-semibold">
            {deliverable.title || "Untitled deliverable"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {deliverable.candidates.map((item) => item.name).join(", ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{deliverableStatusLabel(deliverable.status)}</Badge>
          {deliverable.report ? (
            <Badge variant="outline">{deliverable.report.status}</Badge>
          ) : null}
        </div>
      </div>
      <Link
        href={`/faculty/deliverables/${deliverable.id}`}
        className="text-sm font-medium hover:underline"
      >
        Open scoring and files
      </Link>
      {deliverable.status === "UNDER_COMMITTEE_REVIEW" ? (
        <p className="text-sm text-muted-foreground">
          CO and scores are paused while an integrity case is open.
        </p>
      ) : (
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="deliverableId" value={deliverable.id} />
        <p className="text-sm font-medium">CO attainment sheet</p>
        {rows.map((row, index) => (
          <div key={`${row.code}-${index}`} className="grid gap-2 sm:grid-cols-4">
            <Input name="coCode" placeholder="CO1" defaultValue={row.code} />
            <Input
              name="coStatement"
              placeholder="Statement"
              defaultValue={row.statement}
              className="sm:col-span-1"
            />
            <Input name="coLevel" placeholder="Level" defaultValue={row.level} />
            <Input name="coRemarks" placeholder="Remarks" defaultValue={row.remarks} />
          </div>
        ))}
        <div className="grid gap-2 sm:grid-cols-4">
          <Input name="coCode" placeholder="Add CO code" />
          <Input name="coStatement" placeholder="Statement" />
          <Input name="coLevel" placeholder="Level" />
          <Input name="coRemarks" placeholder="Remarks" />
        </div>
        {state.message ? (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        ) : null}
        <SubmitButton pendingLabel="Saving…">Save CO sheet</SubmitButton>
      </form>
      )}
    </article>
  )
}
