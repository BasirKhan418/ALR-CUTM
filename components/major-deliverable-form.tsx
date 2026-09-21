"use client"

import { useActionState } from "react"
import { CircleAlertIcon } from "lucide-react"
import {
  addDeliverableCandidate,
  removeDeliverableCandidate,
  savePublication,
  submitDeliverable,
  submitForEvaluation,
  submitPublication,
  uploadDeliverableFile,
  upsertDeliverableDraft,
  type DeliverableFormState,
} from "@/lib/actions/deliverable"
import { PlagiarismReportPanel } from "@/components/plagiarism-report-panel"
import { SignoffStepper } from "@/components/signoff-stepper"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { INTERNSHIP_FORMULA_TEXT } from "@/lib/domain/internship"
import {
  allowedDeliverableTypes,
  canEditDeliverable,
  defaultDeliverableType,
  deliverableLabel,
  deliverableStatusLabel,
} from "@/lib/domain/deliverable"
import type { RecordType } from "@/lib/domain/record-types"
import type {
  DeliverableView,
  EnrolledStudentOption,
  StaffOption,
} from "@/lib/deliverable/types"
import { formatMarks } from "@/lib/scoring/format"

const INITIAL: DeliverableFormState = { ok: false }

export function MajorDeliverableForm({
  courseId,
  recordType,
  deliverable,
  staff,
  classmates,
}: {
  courseId: string
  recordType: RecordType
  deliverable: DeliverableView | null
  staff: StaffOption[]
  classmates: EnrolledStudentOption[]
}) {
  const types = allowedDeliverableTypes(recordType)
  const [draftState, draftAction] = useActionState(upsertDeliverableDraft, INITIAL)
  const [submitState, submitAction] = useActionState(submitDeliverable, INITIAL)
  const [evalState, evalAction] = useActionState(submitForEvaluation, INITIAL)
  const current = deliverable
  const editable = !current || canEditDeliverable(current.status)
  const thesisLocked =
    current?.type === "PG_THESIS" && current.publication?.status !== "APPROVED"

  return (
    <div className="flex flex-col gap-4">
      {current ? (
        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{deliverableLabel(current.type)}</p>
              <h2 className="mt-1 font-heading text-xl font-semibold">
                {current.title || "Untitled deliverable"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                One shared record. Cover names:{" "}
                {current.candidates.map((item) => item.name).join(", ")}.
              </p>
            </div>
            <Badge>{deliverableStatusLabel(current.status)}</Badge>
          </div>
          {current.lastReturnReason ? (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
              Returned: {current.lastReturnReason}
            </p>
          ) : null}
          {current.status === "UNDER_COMMITTEE_REVIEW" ? (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
              This record is under committee review. Sign-off is paused.
            </p>
          ) : null}
        </section>
      ) : null}
      {current?.report ? (
        <PlagiarismReportPanel
          report={current.report}
          caseHref={
            current.report.caseId
              ? `/student/cases/${current.report.caseId}`
              : undefined
          }
        />
      ) : null}

      <form
        action={draftAction}
        className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
      >
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="recordType" value={recordType} />
        <div>
          <h3 className="font-heading text-lg font-semibold">Cover and supervisors</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Word and PDF stay on this one record. Sign-off is a chain of steps.
          </p>
        </div>
        {types.length > 1 ? (
          <Field>
            <FieldLabel htmlFor="type">Deliverable type</FieldLabel>
            <select
              id="type"
              name="type"
              disabled={!editable}
              defaultValue={current?.type ?? defaultDeliverableType(recordType) ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {deliverableLabel(type)}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <input type="hidden" name="type" value={types[0]} />
        )}
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            name="title"
            disabled={!editable}
            defaultValue={current?.title ?? ""}
            placeholder="Project / internship / thesis title"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="specialization">Specialization (optional)</FieldLabel>
          <Input
            id="specialization"
            name="specialization"
            disabled={!editable}
            defaultValue={current?.specialization ?? ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="supervisorId">Supervisor</FieldLabel>
            <select
              id="supervisorId"
              name="supervisorId"
              disabled={!editable}
              defaultValue={current?.supervisorId ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">Choose supervisor</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="coSupervisorId">Co-supervisor (optional)</FieldLabel>
            <select
              id="coSupervisorId"
              name="coSupervisorId"
              disabled={!editable}
              defaultValue={current?.coSupervisorId ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">None — this step is skipped</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {recordType === "INTERNSHIP_REPORT" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="industryName">Industry supervisor</FieldLabel>
              <Input
                id="industryName"
                name="industryName"
                disabled={!editable}
                defaultValue={current?.industrySupervisor.name ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="industryEmail">Industry email</FieldLabel>
              <Input
                id="industryEmail"
                name="industryEmail"
                type="email"
                disabled={!editable}
                defaultValue={current?.industrySupervisor.email ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="industryOrg">Organisation</FieldLabel>
              <Input
                id="industryOrg"
                name="industryOrg"
                disabled={!editable}
                defaultValue={current?.industrySupervisor.org ?? ""}
              />
            </Field>
          </div>
        ) : null}
        <Message state={draftState} />
        {editable ? (
          <SubmitButton pendingLabel="Saving draft…">Save draft</SubmitButton>
        ) : (
          <p className="text-sm text-muted-foreground">
            Locked while the sign-off chain is open.
          </p>
        )}
      </form>

      {current ? (
        <>
          <TeamCard deliverable={current} classmates={classmates} editable={editable} />
          <FilesCard deliverable={current} editable={editable} />
          <SignoffCard deliverable={current} />
          {current.type === "PG_THESIS" ? (
            <PublicationCard deliverable={current} />
          ) : null}
          {current.type === "INTERNSHIP" ? (
            <section className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10 sm:p-5">
              <h3 className="font-heading text-lg font-semibold">Internship scores</h3>
              <p className="mt-1 text-muted-foreground">{INTERNSHIP_FORMULA_TEXT}</p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <ScoreStat
                  label="Internal / 50"
                  value={current.internScores.internal}
                />
                <ScoreStat
                  label="External / 50"
                  value={current.internScores.external}
                />
                <ScoreStat label="Report total / 30" value={current.internScores.total} />
              </dl>
            </section>
          ) : null}
          {editable ? (
            <form
              action={current.type === "PG_THESIS" ? evalAction : submitAction}
              className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
            >
              <input type="hidden" name="deliverableId" value={current.id} />
              <SubmitButton pendingLabel="Submitting…">
                {current.type === "PG_THESIS"
                  ? "Submit for evaluation"
                  : "Submit to supervisor"}
              </SubmitButton>
              <Message state={current.type === "PG_THESIS" ? evalState : submitState} />
              <p className="text-xs text-muted-foreground">
                {current.type === "PG_THESIS"
                  ? thesisLocked
                    ? "Blocked until the Paper Publication Report is fully approved."
                    : "Publication is approved. This starts the thesis sign-off chain."
                  : "Submit is blocked until both Word and PDF are on this record."}
              </p>
            </form>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Save a draft to add teammates and upload Word + PDF.
        </p>
      )}
    </div>
  )
}

function TeamCard({
  deliverable,
  classmates,
  editable,
}: {
  deliverable: DeliverableView
  classmates: EnrolledStudentOption[]
  editable: boolean
}) {
  const [addState, addAction] = useActionState(addDeliverableCandidate, INITIAL)
  const [removeState, removeAction] = useActionState(
    removeDeliverableCandidate,
    INITIAL
  )
  const taken = new Set(deliverable.candidates.map((item) => item.id))
  const available = classmates.filter((item) => !taken.has(item.id))

  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <h3 className="font-heading text-lg font-semibold">Candidates</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Up to three names on one record. There is no duplicate-record workaround.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {deliverable.candidates.map((person) => (
          <li
            key={person.id}
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 ring-1 ring-foreground/10"
          >
            <span>
              <span className="block text-sm font-medium">{person.name}</span>
              <span className="block text-xs text-muted-foreground">
                {person.registrationNo || person.email}
              </span>
            </span>
            {editable && deliverable.candidates.length > 1 ? (
              <form action={removeAction}>
                <input type="hidden" name="deliverableId" value={deliverable.id} />
                <input type="hidden" name="studentId" value={person.id} />
                <Button type="submit" variant="ghost" size="sm">
                  Remove
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {editable && available.length > 0 && deliverable.candidates.length < 3 ? (
        <form action={addAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="deliverableId" value={deliverable.id} />
          <Field className="min-w-48 flex-1">
            <FieldLabel htmlFor="studentId">Add enrolled teammate</FieldLabel>
            <select
              id="studentId"
              name="studentId"
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {available.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>
          <SubmitButton pendingLabel="Adding…">Add candidate</SubmitButton>
        </form>
      ) : null}
      <Message state={addState} />
      <Message state={removeState} />
    </section>
  )
}

function FilesCard({
  deliverable,
  editable,
}: {
  deliverable: DeliverableView
  editable: boolean
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <FileSlot
        deliverableId={deliverable.id}
        kind="DOCX"
        label="Word (required)"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        fileName={deliverable.word?.originalName}
        fileId={deliverable.word?.id}
        editable={editable}
      />
      <FileSlot
        deliverableId={deliverable.id}
        kind="PDF"
        label="PDF (required)"
        accept=".pdf,application/pdf"
        fileName={deliverable.pdf?.originalName}
        fileId={deliverable.pdf?.id}
        editable={editable}
      />
    </section>
  )
}

function FileSlot({
  deliverableId,
  kind,
  label,
  accept,
  fileName,
  fileId,
  editable,
}: {
  deliverableId: string
  kind: "DOCX" | "PDF"
  label: string
  accept: string
  fileName?: string
  fileId?: string
  editable: boolean
}) {
  const [state, action] = useActionState(uploadDeliverableFile, INITIAL)
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
    >
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="kind" value={kind} />
      <Field>
        <FieldLabel htmlFor={`${kind}-file`}>{label}</FieldLabel>
        <Input
          id={`${kind}-file`}
          name="file"
          type="file"
          accept={accept}
          disabled={!editable}
          required
        />
        <FieldDescription>
          {fileName ? (
            fileId ? (
              <a href={`/api/files/${fileId}`} className="font-medium hover:underline">
                On file: {fileName}
              </a>
            ) : (
              `On file: ${fileName}`
            )
          ) : (
            "Missing — submit stays blocked."
          )}
        </FieldDescription>
      </Field>
      {editable ? (
        <SubmitButton pendingLabel="Uploading…">Upload {kind === "DOCX" ? "Word" : "PDF"}</SubmitButton>
      ) : null}
      <Message state={state} />
    </form>
  )
}

function SignoffCard({ deliverable }: { deliverable: DeliverableView }) {
  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <h3 className="font-heading text-lg font-semibold">Sign-off chain</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Student → Supervisor → Co-supervisor (if named) → HoD or Dean. History is
        kept when a step is returned.
      </p>
      <div className="mt-3">
        <SignoffStepper steps={deliverable.steps} />
      </div>
    </section>
  )
}

function PublicationCard({
  deliverable,
}: {
  deliverable: DeliverableView
}) {
  const [saveState, saveAction] = useActionState(savePublication, INITIAL)
  const [submitState, submitAction] = useActionState(submitPublication, INITIAL)
  const pub = deliverable.publication
  const pubEditable = !pub || pub.status === "DRAFT" || pub.status === "RETURNED"

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div>
        <h3 className="font-heading text-lg font-semibold">Paper Publication Report</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Candidate → Supervisor / Co-supervisor → HoD. Thesis evaluation stays
          locked until this chain is approved.
        </p>
      </div>
      <form action={saveAction} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="deliverableId" value={deliverable.id} />
        <Field>
          <FieldLabel htmlFor="publicationTitle">Paper title</FieldLabel>
          <Input
            id="publicationTitle"
            name="publicationTitle"
            disabled={!pubEditable}
            defaultValue={pub?.title ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="publicationVenue">Venue</FieldLabel>
          <Input
            id="publicationVenue"
            name="publicationVenue"
            disabled={!pubEditable}
            defaultValue={pub?.venue ?? ""}
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="proof">Proof PDF</FieldLabel>
          <Input
            id="proof"
            name="proof"
            type="file"
            accept=".pdf,application/pdf"
            disabled={!pubEditable}
          />
          <FieldDescription>
            {pub?.proof ? (
              <a
                href={`/api/files/${pub.proof.id}`}
                className="font-medium hover:underline"
              >
                On file: {pub.proof.originalName}
              </a>
            ) : (
              "Attach the acceptance or published PDF."
            )}
          </FieldDescription>
        </Field>
        {pubEditable ? (
          <SubmitButton pendingLabel="Saving…">Save publication</SubmitButton>
        ) : (
          <Badge>{pub?.status}</Badge>
        )}
      </form>
      <Message state={saveState} />
      {pubEditable && pub ? (
        <form action={submitAction}>
          <input type="hidden" name="deliverableId" value={deliverable.id} />
          <SubmitButton pendingLabel="Submitting…">
            Submit publication for sign-off
          </SubmitButton>
        </form>
      ) : null}
      <Message state={submitState} />
      {pub ? <SignoffStepper steps={pub.steps} empty="Publication sign-off has not started." /> : null}
    </section>
  )
}

function ScoreStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 font-medium">
        {value === null ? "—" : formatMarks(value)}
      </p>
    </div>
  )
}

function Message({ state }: { state: DeliverableFormState }) {
  if (!state.message) return null
  if (state.ok) return <p className="text-sm text-muted-foreground">{state.message}</p>
  return (
    <FieldError className="flex items-center gap-1.5">
      <CircleAlertIcon className="size-3.5" />
      {state.message}
    </FieldError>
  )
}
