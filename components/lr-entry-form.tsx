"use client"

import { useActionState } from "react"
import { CircleAlertIcon } from "lucide-react"
import { saveLrEntry, type LrFormState } from "@/lib/actions/lr"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { LiveLrRecordType } from "@/lib/domain/lr"
import type { LrEntryView } from "@/lib/lr/types"

const INITIAL: LrFormState = { ok: false }

function emptyEntry(
  courseId: string,
  recordType: LiveLrRecordType
): LrEntryView {
  return {
    id: "",
    campusId: "",
    studentId: "",
    courseId,
    termId: "",
    recordType,
    status: "DRAFT",
    submittedAt: null,
    sessionDate: "",
    topic: "",
    reflection: "",
    hours: "",
    experimentNo: "",
    title: "",
    concept: "",
    planning: "",
    result: "",
    recordNotes: "",
    vivaNotes: "",
    taskTitle: "",
    criticalThinking: "",
    hoursContributed: "",
    booksManuals: "",
    createdAt: "",
  }
}

export function LrEntryForm({
  courseId,
  recordType,
  entry,
}: {
  courseId: string
  recordType: LiveLrRecordType
  entry?: LrEntryView
}) {
  const [state, action] = useActionState(saveLrEntry, INITIAL)
  const current = entry ?? emptyEntry(courseId, recordType)
  const locked = current.status === "SUBMITTED"

  return (
    <form
      action={action}
      noValidate
      className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="recordType" value={recordType} />
      {current.id ? <input type="hidden" name="entryId" value={current.id} /> : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {headingFor(recordType, current)}
        </p>
        <Badge variant={locked ? "default" : "outline"}>
          {locked ? "Submitted" : "Draft"}
        </Badge>
      </div>
      <FieldGroup>
        {recordType === "CLASSROOM_LEARNING" ? (
          <ClassroomFields entry={current} locked={locked} />
        ) : null}
        {recordType === "APPLIED_ACTION_LEARNING" ? (
          <AppliedFields entry={current} locked={locked} />
        ) : null}
        {recordType === "ACTION_LEARNING" ? (
          <WorkshopFields entry={current} locked={locked} />
        ) : null}
        <Field>
          <FieldLabel htmlFor={`${current.id || "new"}-booksManuals`}>
            Books / Manuals Referred
          </FieldLabel>
          <Textarea
            id={`${current.id || "new"}-booksManuals`}
            name="booksManuals"
            disabled={locked}
            defaultValue={current.booksManuals}
            placeholder="Title, author — or None"
          />
          <FieldDescription>
            Required on every booklet sheet. Write None if you did not use any.
          </FieldDescription>
        </Field>
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
        {locked ? (
          <p className="text-sm text-muted-foreground">
            Submitted. Faculty can read this record. Scoring opens later.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <SubmitButton
              name="intent"
              value="draft"
              variant="outline"
              pendingLabel="Saving…"
            >
              Save draft
            </SubmitButton>
            <SubmitButton name="intent" value="submit" pendingLabel="Submitting…">
              Submit
            </SubmitButton>
            <p className="w-full text-xs text-muted-foreground">
              Save draft anytime. Submit checks every required field, including
              Books/Manuals Referred.
            </p>
          </div>
        )}
      </FieldGroup>
    </form>
  )
}

function headingFor(recordType: LiveLrRecordType, entry: LrEntryView) {
  if (recordType === "CLASSROOM_LEARNING") {
    return entry.topic || "Classroom session"
  }
  if (recordType === "APPLIED_ACTION_LEARNING") {
    return entry.title
      ? `Experiment ${entry.experimentNo || ""} · ${entry.title}`
      : "New experiment"
  }
  return entry.taskTitle || "Workshop task"
}

function ClassroomFields({
  entry,
  locked,
}: {
  entry: LrEntryView
  locked: boolean
}) {
  const id = entry.id || "new"
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-sessionDate`}>Session date</FieldLabel>
          <Input
            id={`${id}-sessionDate`}
            name="sessionDate"
            type="date"
            disabled={locked}
            defaultValue={entry.sessionDate}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-hours`}>Hours (optional)</FieldLabel>
          <Input
            id={`${id}-hours`}
            name="hours"
            type="number"
            min="0"
            step="0.5"
            disabled={locked}
            defaultValue={entry.hours}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`${id}-topic`}>Topic</FieldLabel>
        <Input
          id={`${id}-topic`}
          name="topic"
          disabled={locked}
          defaultValue={entry.topic}
          placeholder="What was taught or discussed"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-reflection`}>Reflection</FieldLabel>
        <Textarea
          id={`${id}-reflection`}
          name="reflection"
          disabled={locked}
          defaultValue={entry.reflection}
          placeholder="What you understood and what remains unclear"
        />
      </Field>
    </>
  )
}

function AppliedFields({
  entry,
  locked,
}: {
  entry: LrEntryView
  locked: boolean
}) {
  const id = entry.id || "new"
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-experimentNo`}>Experiment no.</FieldLabel>
          <Input
            id={`${id}-experimentNo`}
            name="experimentNo"
            type="number"
            min="1"
            disabled={locked}
            defaultValue={entry.experimentNo}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
          <Input
            id={`${id}-title`}
            name="title"
            disabled={locked}
            defaultValue={entry.title}
            placeholder="Experiment title"
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`${id}-concept`}>Concept</FieldLabel>
        <Textarea
          id={`${id}-concept`}
          name="concept"
          disabled={locked}
          defaultValue={entry.concept}
        />
        <FieldDescription>
          Narrative only. Faculty enter the 10-mark rubric in the next milestone.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-planning`}>Planning and execution</FieldLabel>
        <Textarea
          id={`${id}-planning`}
          name="planning"
          disabled={locked}
          defaultValue={entry.planning}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-result`}>Result and interpretation</FieldLabel>
        <Textarea
          id={`${id}-result`}
          name="result"
          disabled={locked}
          defaultValue={entry.result}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-recordNotes`}>Record</FieldLabel>
        <Textarea
          id={`${id}-recordNotes`}
          name="recordNotes"
          disabled={locked}
          defaultValue={entry.recordNotes}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-vivaNotes`}>Viva</FieldLabel>
        <Textarea
          id={`${id}-vivaNotes`}
          name="vivaNotes"
          disabled={locked}
          defaultValue={entry.vivaNotes}
        />
      </Field>
    </>
  )
}

function WorkshopFields({
  entry,
  locked,
}: {
  entry: LrEntryView
  locked: boolean
}) {
  const id = entry.id || "new"
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${id}-taskTitle`}>Task title</FieldLabel>
        <Input
          id={`${id}-taskTitle`}
          name="taskTitle"
          disabled={locked}
          defaultValue={entry.taskTitle}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-criticalThinking`}>
          Critical thinking / fieldwork / report
        </FieldLabel>
        <Textarea
          id={`${id}-criticalThinking`}
          name="criticalThinking"
          disabled={locked}
          defaultValue={entry.criticalThinking}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-hoursContributed`}>Hours contributed</FieldLabel>
        <Input
          id={`${id}-hoursContributed`}
          name="hoursContributed"
          type="number"
          min="0.5"
          step="0.5"
          disabled={locked}
          defaultValue={entry.hoursContributed}
        />
        <FieldDescription>Hours, not session count.</FieldDescription>
      </Field>
    </>
  )
}

