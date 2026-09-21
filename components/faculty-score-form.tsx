"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
import { CircleAlertIcon } from "lucide-react"
import {
  enqueueAiScore,
  getAiScoreStatus,
  scoreActionEntry,
  scoreAppliedEntry,
  type ScoreFormState,
} from "@/lib/actions/scoring"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ACTION_CRITERIA,
  ACTION_ENTRY_MAX,
  APPLIED_CRITERIA,
  APPLIED_ENTRY_MAX,
  actionTotal,
  appliedTotal,
  scoresDiffer,
  type ActionScores,
  type AppliedScores,
} from "@/lib/domain/scoring"
import { recordTypeLabel } from "@/lib/domain/record-types"
import type { ScoreableEntry } from "@/lib/scoring/types"
import { formatWhen } from "@/lib/ui/format"

const INITIAL: ScoreFormState = { ok: false }

export function FacultyScoreForm({ entry }: { entry: ScoreableEntry }) {
  const action =
    entry.recordType === "ACTION_LEARNING" ? scoreActionEntry : scoreAppliedEntry
  const [state, formAction] = useActionState(action, INITIAL)
  const [aiState, aiAction] = useActionState(enqueueAiScore, INITIAL)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      criteriaFor(entry).map((item) => [
        item.key,
        numberText(entry.facultyScores[item.key]),
      ])
    )
  )
  const [remarks, setRemarks] = useState(entry.facultyRemarks)
  const [overrideReason, setOverrideReason] = useState(entry.overrideReason ?? "")
  const [polledAi, setPolledAi] = useState(entry.latestAi)
  const [dialogOpen, setDialogOpen] = useState(false)
  const ai =
    aiState.runId && (!polledAi || polledAi.runId !== aiState.runId)
      ? {
          runId: aiState.runId,
          status: "QUEUED" as const,
          percent: 5,
          suggestedScores: null,
          message: aiState.message,
        }
      : (polledAi ?? entry.latestAi)

  const criteria = criteriaFor(entry)
  const max = entry.recordType === "ACTION_LEARNING" ? ACTION_ENTRY_MAX : APPLIED_ENTRY_MAX
  const total = useMemo(() => {
    const numbers = Object.fromEntries(
      criteria.map((item) => [item.key, Number(values[item.key] || 0)])
    )
    return entry.recordType === "ACTION_LEARNING"
      ? actionTotal(numbers as ActionScores)
      : appliedTotal(numbers as AppliedScores)
  }, [criteria, entry.recordType, values])

  const suggested = ai?.suggestedScores ?? null
  const differs = scoresDiffer(
    Object.fromEntries(
      criteria.map((item) => [item.key, Number(values[item.key] || 0)])
    ),
    suggested
  )

  useEffect(() => {
    const runId = aiState.runId ?? ai?.runId
    if (!runId) return
    if (ai?.status === "DONE" || ai?.status === "FAILED") return
    let cancelled = false
    const timer = window.setInterval(async () => {
      const next = await getAiScoreStatus(runId)
      if (cancelled || !next) return
      setPolledAi(next)
      if (next.status === "DONE" && next.suggestedScores) {
        setValues((current) => fillEmpty(current, next.suggestedScores ?? {}))
      }
    }, 1500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [ai?.runId, ai?.status, aiState.runId])

  function applySuggested() {
    if (!suggested) return
    setValues((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(suggested).map(([key, value]) => [key, String(value)])
      ),
    }))
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">Score this record</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {recordTypeLabel(entry.recordType)} rubric · live total {total} / {max}.
          </p>
        </div>
        {entry.scoredAt ? (
          <Badge>Scored {formatWhen(entry.scoredAt)}</Badge>
        ) : (
          <Badge variant="outline">Unscored</Badge>
        )}
      </div>

      {state.message ? (
        <p
          className={
            state.ok
              ? "text-sm text-muted-foreground"
              : "flex items-start gap-2 text-sm text-destructive"
          }
        >
          {state.ok ? null : <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />}
          {state.message}
        </p>
      ) : null}

      <form action={aiAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="entryId" value={entry.id} />
        <SubmitButton variant="outline" pendingLabel="Queueing AI…">
          Ask AI to draft scores
        </SubmitButton>
        {ai ? (
          <Badge variant={ai.status === "DONE" ? "secondary" : "outline"}>
            {ai.status === "QUEUED"
              ? `AI ${ai.percent}%`
              : ai.status === "DONE"
                ? "AI draft ready"
                : "AI failed"}
          </Badge>
        ) : null}
        {suggested ? (
          <Button type="button" variant="ghost" size="sm" onClick={applySuggested}>
            Use AI draft
          </Button>
        ) : null}
        {ai?.message ? (
          <p className="w-full text-sm text-muted-foreground">{ai.message}</p>
        ) : null}
      </form>

      <form
        action={formAction}
        onSubmit={(event) => {
          if (suggested && differs && !overrideReason.trim()) {
            event.preventDefault()
            setDialogOpen(true)
          }
        }}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="overrideReason" value={overrideReason} />
        <div className="grid gap-4 sm:grid-cols-2">
          {criteria.map((item) => (
            <Field key={item.key}>
              <FieldLabel htmlFor={item.key}>
                {item.label} / {item.max}
              </FieldLabel>
              <Input
                id={item.key}
                name={item.key}
                type="number"
                min={0}
                max={item.max}
                step="0.5"
                required
                value={values[item.key] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [item.key]: event.target.value,
                  }))
                }
              />
              {suggested && suggested[item.key] !== undefined ? (
                <FieldDescription>AI draft {suggested[item.key]}</FieldDescription>
              ) : null}
            </Field>
          ))}
        </div>

        <Field>
          <FieldLabel htmlFor="facultyRemarks">Remarks</FieldLabel>
          <Textarea
            id="facultyRemarks"
            name="facultyRemarks"
            rows={3}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
          />
        </Field>

        {suggested && differs ? (
          <Field>
            <FieldLabel htmlFor="overrideReasonVisible">Override reason</FieldLabel>
            <Textarea
              id="overrideReasonVisible"
              rows={3}
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Required when the saved marks differ from the AI draft. The student will see this."
            />
            <FieldDescription>
              The student sees this reason. They never see the stub AI notes.
            </FieldDescription>
            {!overrideReason.trim() ? (
              <FieldError>An override reason is required before save.</FieldError>
            ) : null}
          </Field>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="font-heading text-xl font-semibold">
            {total} / {max}
          </p>
          <SubmitButton pendingLabel="Saving scores…">Save scores</SubmitButton>
        </div>
      </form>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override the AI draft?</DialogTitle>
            <DialogDescription>
              Your marks differ from the suggested scores. Add a reason the student
              can see, then save again.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={overrideReason}
            onChange={(event) => setOverrideReason(event.target.value)}
            placeholder="Why these marks replace the AI draft"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => setDialogOpen(false)}>
              Use this reason
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function criteriaFor(entry: ScoreableEntry) {
  return entry.recordType === "ACTION_LEARNING" ? ACTION_CRITERIA : APPLIED_CRITERIA
}

function numberText(value?: number) {
  return value === undefined || Number.isNaN(value) ? "" : String(value)
}

function fillEmpty(
  current: Record<string, string>,
  suggested: Record<string, number>
) {
  const next = { ...current }
  for (const [key, value] of Object.entries(suggested)) {
    if (!next[key]) next[key] = String(value)
  }
  return next
}
