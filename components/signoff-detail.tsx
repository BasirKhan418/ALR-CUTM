"use client"

import { useActionState } from "react"
import {
  decidePublication,
  decideSignoff,
  issueIndustryToken,
  scoreDeliverableRubric,
  scoreInternshipInternal,
  type DeliverableFormState,
} from "@/lib/actions/deliverable"
import { PlagiarismReportPanel } from "@/components/plagiarism-report-panel"
import { SignoffStepper } from "@/components/signoff-stepper"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { INTERNSHIP_FORMULA_TEXT } from "@/lib/domain/internship"
import {
  deliverableLabel,
  deliverableStatusLabel,
} from "@/lib/domain/deliverable"
import type { DeliverableView } from "@/lib/deliverable/types"
import { formatMarks } from "@/lib/scoring/format"

const INITIAL: DeliverableFormState = { ok: false }

export function SignoffDetail({
  deliverable,
  canDecide,
  canDecidePublication = false,
  canExclude = false,
  caseBase,
}: {
  deliverable: DeliverableView
  canDecide: boolean
  canDecidePublication?: boolean
  canExclude?: boolean
  caseBase?: string
}) {
  const [state, action] = useActionState(decideSignoff, INITIAL)

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {deliverable.courseCode}
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              {deliverable.title || "Untitled deliverable"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {deliverable.candidates.map((item) => item.name).join(", ")} ·{" "}
              {deliverableLabel(deliverable.type)}
            </p>
          </div>
          <Badge>{deliverableStatusLabel(deliverable.status)}</Badge>
        </div>
        {deliverable.status === "UNDER_COMMITTEE_REVIEW" ? (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
            Sign-off is paused while an integrity case is open.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {deliverable.word ? (
            <a
              href={`/api/files/${deliverable.word.id}`}
              className="text-sm font-medium hover:underline"
            >
              Word: {deliverable.word.originalName}
            </a>
          ) : null}
          {deliverable.pdf ? (
            <a
              href={`/api/files/${deliverable.pdf.id}`}
              className="text-sm font-medium hover:underline"
            >
              PDF: {deliverable.pdf.originalName}
            </a>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-heading text-lg font-semibold">Sign-off chain</h2>
        <div className="mt-3">
          <SignoffStepper steps={deliverable.steps} />
        </div>
      </section>

      {canDecide && deliverable.status !== "UNDER_COMMITTEE_REVIEW" ? (
        <form
          action={action}
          className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
        >
          <input type="hidden" name="deliverableId" value={deliverable.id} />
          <h2 className="font-heading text-lg font-semibold">Your decision</h2>
          <Field>
            <FieldLabel htmlFor="decision">Decision</FieldLabel>
            <select
              id="decision"
              name="decision"
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm sm:w-64"
              defaultValue="APPROVED"
            >
              <option value="APPROVED">Approve</option>
              <option value="RETURNED">Return</option>
              <option value="REJECTED">Reject</option>
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="reason">Reason</FieldLabel>
            <Textarea
              id="reason"
              name="reason"
              rows={3}
              className="min-h-20"
              placeholder="Required when you return or reject. Candidates see this."
            />
          </Field>
          {state.message ? (
            state.ok ? (
              <p className="text-sm text-muted-foreground">{state.message}</p>
            ) : (
              <FieldError>{state.message}</FieldError>
            )
          ) : null}
          <SubmitButton pendingLabel="Recording…">Record decision</SubmitButton>
        </form>
      ) : null}

      {deliverable.status === "UNDER_COMMITTEE_REVIEW" ? null : deliverable.type === "INTERNSHIP" ? (
        <InternshipTools deliverable={deliverable} />
      ) : (
        <RubricForm deliverable={deliverable} />
      )}

      {deliverable.report ? (
        <PlagiarismReportPanel
          report={deliverable.report}
          canExclude={canExclude}
          caseHref={
            deliverable.report.caseId && caseBase
              ? `${caseBase}/${deliverable.report.caseId}`
              : undefined
          }
        />
      ) : null}

      {deliverable.publication ? (
        <PublicationDecision
          deliverable={deliverable}
          canDecide={canDecidePublication}
        />
      ) : null}
    </div>
  )
}

function InternshipTools({ deliverable }: { deliverable: DeliverableView }) {
  const [scoreState, scoreAction] = useActionState(scoreInternshipInternal, INITIAL)
  const [tokenState, tokenAction] = useActionState(issueIndustryToken, INITIAL)
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <form
        action={scoreAction}
        className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
      >
        <input type="hidden" name="deliverableId" value={deliverable.id} />
        <h2 className="font-heading text-lg font-semibold">Internal score / 50</h2>
        <p className="text-sm text-muted-foreground">{INTERNSHIP_FORMULA_TEXT}</p>
        <Input
          name="internal"
          type="number"
          min={0}
          max={50}
          step="0.5"
          required
          defaultValue={deliverable.internScores.internal ?? ""}
        />
        <p className="text-sm">
          External{" "}
          {deliverable.internScores.external === null
            ? "—"
            : formatMarks(deliverable.internScores.external)}{" "}
          / 50 · Total{" "}
          {deliverable.internScores.total === null
            ? "—"
            : `${formatMarks(deliverable.internScores.total)} / 30`}
        </p>
        {scoreState.message ? (
          <p className="text-sm text-muted-foreground">{scoreState.message}</p>
        ) : null}
        <SubmitButton pendingLabel="Saving…">Save internal score</SubmitButton>
      </form>
      <form
        action={tokenAction}
        className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
      >
        <input type="hidden" name="deliverableId" value={deliverable.id} />
        <h2 className="font-heading text-lg font-semibold">Industry token</h2>
        <p className="text-sm text-muted-foreground">
          No university login. The link expires in 14 days.
        </p>
        {tokenState.tokenUrl ? (
          <p className="break-all text-sm font-medium">{tokenState.tokenUrl}</p>
        ) : null}
        {tokenState.message ? (
          <p className="text-sm text-muted-foreground">{tokenState.message}</p>
        ) : null}
        <SubmitButton pendingLabel="Issuing…">Issue industry link</SubmitButton>
      </form>
    </section>
  )
}

function RubricForm({ deliverable }: { deliverable: DeliverableView }) {
  const [state, action] = useActionState(scoreDeliverableRubric, INITIAL)
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
    >
      <input type="hidden" name="deliverableId" value={deliverable.id} />
      <h2 className="font-heading text-lg font-semibold">Report score / 30</h2>
      <p className="text-sm text-muted-foreground">
        Booklet and Framework use the same 30-point scale. No extra conversion.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="rubricTotal">Total</FieldLabel>
          <Input
            id="rubricTotal"
            name="rubricTotal"
            type="number"
            min={0}
            max={30}
            step="0.5"
            required
            defaultValue={deliverable.rubricTotal ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="rubricRemarks">Remarks</FieldLabel>
          <Input
            id="rubricRemarks"
            name="rubricRemarks"
            defaultValue={deliverable.rubricRemarks}
          />
        </Field>
      </div>
      {state.message ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : null}
      <SubmitButton pendingLabel="Saving…">Save 30-point score</SubmitButton>
    </form>
  )
}

function PublicationDecision({
  deliverable,
  canDecide,
}: {
  deliverable: DeliverableView
  canDecide: boolean
}) {
  const [state, action] = useActionState(decidePublication, INITIAL)
  const pub = deliverable.publication
  if (!pub) return null
  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <h2 className="font-heading text-lg font-semibold">Publication report</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {pub.title} · {pub.venue}
      </p>
      {pub.proof ? (
        <a
          href={`/api/files/${pub.proof.id}`}
          className="mt-2 inline-block text-sm font-medium hover:underline"
        >
          Proof: {pub.proof.originalName}
        </a>
      ) : null}
      <div className="mt-3">
        <SignoffStepper steps={pub.steps} />
      </div>
      {canDecide && pub.status === "SUBMITTED" ? (
        <form action={action} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="publicationId" value={pub.id} />
          <select
            name="decision"
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm sm:w-64"
            defaultValue="APPROVED"
          >
            <option value="APPROVED">Approve publication</option>
            <option value="RETURNED">Return publication</option>
            <option value="REJECTED">Reject publication</option>
          </select>
          <Textarea name="reason" rows={3} className="min-h-20" placeholder="Reason if returned or rejected" />
          {state.message ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : null}
          <SubmitButton pendingLabel="Recording…">Record publication decision</SubmitButton>
        </form>
      ) : null}
    </section>
  )
}
