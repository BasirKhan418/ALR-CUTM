"use client"

import { useActionState } from "react"
import { CircleAlertIcon } from "lucide-react"
import {
  assignCaseCommittee,
  decidePlagiarismCase,
  recommendPlagiarismCase,
  respondToPlagiarismCase,
  type PlagiarismFormState,
} from "@/lib/actions/plagiarism"
import { PlagiarismReportPanel } from "@/components/plagiarism-report-panel"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { caseStatusLabel } from "@/lib/domain/plagiarism"
import type { PlagiarismCaseView } from "@/lib/plagiarism/types"
import { formatWhen } from "@/lib/ui/format"

const INITIAL: PlagiarismFormState = { ok: false }

export function PlagiarismCaseDetail({
  view,
  staff,
  caseHref,
}: {
  view: PlagiarismCaseView
  staff: { id: string; name: string }[]
  caseHref: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{view.courseCode}</p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              {view.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {view.studentNames}
            </p>
          </div>
          <Badge>{caseStatusLabel(view.status)}</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Response due" value={formatWhen(view.responseDueAt)} />
          <Stat
            label="Timer"
            value={view.responseExpired ? "Expired" : "Open"}
          />
          <Stat
            label="Committee"
            value={
              view.committeeNames.length > 0
                ? view.committeeNames.join(", ")
                : "Not assigned"
            }
          />
        </div>
        {view.responseExpired ? (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
            The 7-day response window has expired. The maintenance job marked
            this timer.
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <PlagiarismReportPanel
          report={view.report}
          caseHref={caseHref}
        />
        <div className="flex flex-col gap-4">
          {view.studentResponse ? (
            <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
              <h2 className="font-heading text-lg font-semibold">
                Student response
              </h2>
              <p className="mt-2 text-sm leading-6">{view.studentResponse}</p>
            </section>
          ) : null}
          {view.recommendation ? (
            <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
              <h2 className="font-heading text-lg font-semibold">
                Committee recommendation
              </h2>
              <p className="mt-2 text-sm leading-6">{view.recommendation}</p>
            </section>
          ) : null}
          {view.canRespond ? <RespondForm caseId={view.id} /> : null}
          {view.canRecommend ? <RecommendForm caseId={view.id} /> : null}
          {view.canAssign ? (
            <AssignForm
              caseId={view.id}
              staff={staff}
              guideIds={view.guideIds}
              selected={view.committeeMemberIds}
            />
          ) : null}
          {view.canDecide ? <DecideForm caseId={view.id} /> : null}
        </div>
      </div>
    </div>
  )
}

function RespondForm({ caseId }: { caseId: string }) {
  const [state, action] = useActionState(respondToPlagiarismCase, INITIAL)
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <h2 className="font-heading text-lg font-semibold">Your response</h2>
      <Field>
        <FieldLabel htmlFor="response">Statement</FieldLabel>
        <Textarea id="response" name="response" rows={5} className="min-h-28" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Sending…">Submit response</SubmitButton>
    </form>
  )
}

function RecommendForm({ caseId }: { caseId: string }) {
  const [state, action] = useActionState(recommendPlagiarismCase, INITIAL)
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <h2 className="font-heading text-lg font-semibold">Recommendation</h2>
      <Field>
        <FieldLabel htmlFor="recommendation">Committee note</FieldLabel>
        <Textarea
          id="recommendation"
          name="recommendation"
          rows={5}
          className="min-h-28"
          required
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Recording…">Record recommendation</SubmitButton>
    </form>
  )
}

function AssignForm({
  caseId,
  staff,
  guideIds,
  selected,
}: {
  caseId: string
  staff: { id: string; name: string }[]
  guideIds: string[]
  selected: string[]
}) {
  const [state, action] = useActionState(assignCaseCommittee, INITIAL)
  const blocked = new Set(guideIds)
  const options = staff.filter((item) => !blocked.has(item.id))
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <h2 className="font-heading text-lg font-semibold">Committee</h2>
      <p className="text-sm text-muted-foreground">
        The student’s supervisor or guide is filtered out and cannot be assigned.
      </p>
      <div className="flex flex-col gap-2">
        {options.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="memberId"
              value={item.id}
              defaultChecked={selected.includes(item.id)}
            />
            {item.name}
          </label>
        ))}
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save committee</SubmitButton>
    </form>
  )
}

function DecideForm({ caseId }: { caseId: string }) {
  const [state, action] = useActionState(decidePlagiarismCase, INITIAL)
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <h2 className="font-heading text-lg font-semibold">Council</h2>
      <select
        name="decision"
        className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
        defaultValue="COUNCIL_RATIFIED"
      >
        <option value="COUNCIL_RATIFIED">Ratify</option>
        <option value="DISMISSED">Dismiss</option>
      </select>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Recording…">Close case</SubmitButton>
    </form>
  )
}

function FormMessage({ state }: { state: PlagiarismFormState }) {
  if (!state.message) return null
  if (state.ok) return <p className="text-sm text-muted-foreground">{state.message}</p>
  return (
    <FieldError className="flex items-center gap-1.5">
      <CircleAlertIcon className="size-3.5" />
      {state.message}
    </FieldError>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
