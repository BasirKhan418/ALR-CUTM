"use client"

import { useActionState } from "react"
import { CircleAlertIcon } from "lucide-react"
import {
  constituteProgramCommittee,
  constituteYearCommittee,
  cumulateProgram,
  exportProgramToExamCell,
  exportYearToExamCell,
  postYearCredit,
  scoreProgramRubric,
  scoreYearRubric,
  signProgram,
  signYear,
  signYearCo,
  signYearPoPso,
  updateTierSettings,
  type TierFormState,
} from "@/lib/actions/tiers"
import { SubmitButton } from "@/components/submit-button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { YEAR_CRITERIA } from "@/lib/domain/tiers"
import type { TierSettings } from "@/lib/tiers/settings"

const INITIAL: TierFormState = { ok: false }

const selectClass =
  "w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function FormNote({ state }: { state: TierFormState }) {
  if (!state.message) return null
  if (state.ok) {
    return <p className="text-sm text-muted-foreground">{state.message}</p>
  }
  return (
    <FieldError className="flex items-center gap-1.5">
      <CircleAlertIcon className="size-3.5" />
      {state.message}
    </FieldError>
  )
}

export function TierSettingsForm({ settings }: { settings: TierSettings }) {
  const [state, action] = useActionState(updateTierSettings, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="yearWiseUsesFiveCriterion"
          defaultChecked={settings.yearWiseUsesFiveCriterion}
          className="mt-1"
        />
        <span>Year-wise evaluation uses the five-criterion rubric (100).</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="programWiseUsesFiveCriterion"
          defaultChecked={settings.programWiseUsesFiveCriterion}
          className="mt-1"
        />
        <span>Programme evaluation uses the five-criterion rubric (100).</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Programme cumulation scale</span>
        <Input
          name="programCumulateScale"
          type="number"
          min={1}
          max={100}
          step={1}
          required
          defaultValue={settings.programCumulateScale}
          className="max-w-32"
        />
        <span className="text-muted-foreground">
          Cumulated mark = equal-weight mean of year totals × scale ÷ 100. Scale
          100 leaves the mean unchanged.
        </span>
      </label>
      <FormNote state={state} />
      <SubmitButton pendingLabel="Saving…" className="w-fit">
        Save rubric settings
      </SubmitButton>
    </form>
  )
}

export function ConstituteYearForm({
  campusId,
  academicYear,
  students,
  members,
}: {
  campusId: string
  academicYear: string
  students: { id: string; name: string }[]
  members: { id: string; name: string }[]
}) {
  const [state, action] = useActionState(constituteYearCommittee, INITIAL)
  if (students.length === 0) return null
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="campusId" value={campusId} />
      <input type="hidden" name="academicYear" value={academicYear} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Student</span>
        <select name="studentId" required className={`${selectClass} h-8`} defaultValue="">
          <option value="" disabled>
            Choose a student
          </option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      </label>
      <CommitteeSelect members={members} />
      <FormNote state={state} />
      <SubmitButton pendingLabel="Assigning…" className="w-fit" disabled={members.length === 0}>
        Assign committee
      </SubmitButton>
    </form>
  )
}

export function ConstituteProgramForm({
  campusId,
  students,
  members,
}: {
  campusId: string
  students: { id: string; name: string }[]
  members: { id: string; name: string }[]
}) {
  const [state, action] = useActionState(constituteProgramCommittee, INITIAL)
  if (students.length === 0) return null
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="campusId" value={campusId} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Student</span>
        <select name="studentId" required className={`${selectClass} h-8`} defaultValue="">
          <option value="" disabled>
            Choose a student
          </option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      </label>
      <CommitteeSelect members={members} />
      <FormNote state={state} />
      <SubmitButton pendingLabel="Assigning…" className="w-fit" disabled={members.length === 0}>
        Assign programme committee
      </SubmitButton>
    </form>
  )
}

function CommitteeSelect({ members }: { members: { id: string; name: string }[] }) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Provision a user with the Committee role on this campus before assigning a panel.
      </p>
    )
  }
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">Committee</span>
      <select
        name="committeeIds"
        multiple
        required
        className={`${selectClass} min-h-28 py-1`}
      >
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">Hold the modifier key to choose more than one.</span>
    </label>
  )
}

export function RubricForm({
  kind,
  id,
  rows,
  comments,
}: {
  kind: "year" | "program"
  id: string
  rows: { criterionId: string; label: string; max: number; marks: number | null; comment: string }[]
  comments: string
}) {
  const action = kind === "year" ? scoreYearRubric : scoreProgramRubric
  const [state, formAction] = useActionState(action, INITIAL)
  const idName = kind === "year" ? "yearEvaluationId" : "programEvaluationId"
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name={idName} value={id} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Criterion</th>
              <th className="py-2 pr-3 font-medium">Max</th>
              <th className="py-2 pr-3 font-medium">Marks</th>
              <th className="py-2 font-medium">Comment</th>
            </tr>
          </thead>
          <tbody>
            {YEAR_CRITERIA.map((criterion) => {
              const row = rows.find((item) => item.criterionId === criterion.id)
              return (
                <tr key={criterion.id} className="border-t border-border/70">
                  <td className="py-2 pr-3">{criterion.label}</td>
                  <td className="py-2 pr-3">{criterion.max}</td>
                  <td className="py-2 pr-3">
                    <Input
                      name={`marks.${criterion.id}`}
                      type="number"
                      min={0}
                      max={criterion.max}
                      step={1}
                      required
                      defaultValue={row?.marks ?? ""}
                      className="w-24"
                    />
                  </td>
                  <td className="py-2">
                    <Input
                      name={`comment.${criterion.id}`}
                      defaultValue={row?.comment ?? ""}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Overall comments</span>
        <Textarea name="comments" defaultValue={comments} />
      </label>
      <FormNote state={state} />
      <SubmitButton pendingLabel="Saving…" className="w-fit">
        Save rubric
      </SubmitButton>
    </form>
  )
}

export function SignYearForm({ id }: { id: string }) {
  const [state, action] = useActionState(signYear, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="yearEvaluationId" value={id} />
      <p className="text-sm text-muted-foreground">
        Signing posts exactly 1 ALR credit to the Compulsory Basket for this academic year.
      </p>
      <FormNote state={state} />
      <SubmitButton pendingLabel="Signing…" className="w-fit">
        Sign year and post 1 credit
      </SubmitButton>
    </form>
  )
}

export function PostCreditForm({ id }: { id: string }) {
  const [state, action] = useActionState(postYearCredit, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="yearEvaluationId" value={id} />
      <FormNote state={state} />
      <SubmitButton pendingLabel="Posting…" className="w-fit">
        Post 1 credit
      </SubmitButton>
    </form>
  )
}

export function ExportYearForm({ id }: { id: string }) {
  const [state, action] = useActionState(exportYearToExamCell, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="yearEvaluationId" value={id} />
      <FormNote state={state} />
      <SubmitButton pendingLabel="Queuing…" variant="outline" className="w-fit">
        Export to exam cell
      </SubmitButton>
    </form>
  )
}

export function SignPoForm({ id }: { id: string }) {
  const [state, action] = useActionState(signYearPoPso, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="yearEvaluationId" value={id} />
      <Textarea name="sheet" required placeholder="PO/PSO attainment for this student-year" />
      <FormNote state={state} />
      <SubmitButton pendingLabel="Signing…" className="w-fit">
        Sign PO/PSO
      </SubmitButton>
    </form>
  )
}

export function SignCoForm({
  yearId,
  courseId,
  courseCode,
}: {
  yearId: string
  courseId: string
  courseCode: string
}) {
  const [state, action] = useActionState(signYearCo, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="yearEvaluationId" value={yearId} />
      <input type="hidden" name="courseId" value={courseId} />
      <Textarea name="sheet" placeholder={`CO attainment for ${courseCode}`} />
      <FormNote state={state} />
      <SubmitButton pendingLabel="Signing…" className="w-fit">
        Sign CO
      </SubmitButton>
    </form>
  )
}

export function CumulateForm({ id }: { id: string }) {
  const [state, action] = useActionState(cumulateProgram, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="programEvaluationId" value={id} />
      <FormNote state={state} />
      <SubmitButton pendingLabel="Cumulating…" className="w-fit">
        Cumulate year marks
      </SubmitButton>
    </form>
  )
}

export function SignProgramForm({ id }: { id: string }) {
  const [state, action] = useActionState(signProgram, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="programEvaluationId" value={id} />
      <FormNote state={state} />
      <SubmitButton pendingLabel="Signing…" className="w-fit">
        Sign programme
      </SubmitButton>
    </form>
  )
}

export function ExportProgramForm({ id }: { id: string }) {
  const [state, action] = useActionState(exportProgramToExamCell, INITIAL)
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="programEvaluationId" value={id} />
      <FormNote state={state} />
      <SubmitButton pendingLabel="Queuing…" variant="outline" className="w-fit">
        Export programme to exam cell
      </SubmitButton>
    </form>
  )
}
