"use client"

import { useState } from "react"
import { LrEntryForm } from "@/components/lr-entry-form"
import { MajorDeliverableForm } from "@/components/major-deliverable-form"
import { ProgrammingUploadCard } from "@/components/programming-upload-card"
import { Button } from "@/components/ui/button"
import { isMajorLrRecordType } from "@/lib/domain/deliverable"
import {
  isLiveLrRecordType,
  isStubLrRecordType,
  missingRecordTypeMessage,
  stubRecordMessage,
  type LiveLrRecordType,
} from "@/lib/domain/lr"
import type { RecordType } from "@/lib/domain/record-types"
import type {
  DeliverableView,
  EnrolledStudentOption,
  StaffOption,
} from "@/lib/deliverable/types"
import type { LrEntryView } from "@/lib/lr/types"
import type { ProgrammingUploadView } from "@/lib/plagiarism/types"

export function LrRecordPanel({
  courseId,
  recordType,
  required,
  entries,
  deliverable = null,
  staff = [],
  classmates = [],
  programming = null,
}: {
  courseId: string
  recordType: RecordType
  required: boolean
  entries: LrEntryView[]
  deliverable?: DeliverableView | null
  staff?: StaffOption[]
  classmates?: EnrolledStudentOption[]
  programming?: ProgrammingUploadView | null
}) {
  if (!required) {
    return (
      <EmptyCard>{missingRecordTypeMessage(recordType)}</EmptyCard>
    )
  }
  if (isMajorLrRecordType(recordType)) {
    return (
      <MajorDeliverableForm
        courseId={courseId}
        recordType={recordType}
        deliverable={deliverable}
        staff={staff}
        classmates={classmates}
      />
    )
  }
  if (isStubLrRecordType(recordType)) {
    return <EmptyCard>{stubRecordMessage(recordType)}</EmptyCard>
  }
  if (!isLiveLrRecordType(recordType)) {
    return <EmptyCard>{stubRecordMessage(recordType)}</EmptyCard>
  }
  return (
    <LiveRecordList
      courseId={courseId}
      recordType={recordType}
      entries={entries}
      programming={
        recordType === "APPLIED_ACTION_LEARNING" ? programming : null
      }
    />
  )
}

function LiveRecordList({
  courseId,
  recordType,
  entries,
  programming,
}: {
  courseId: string
  recordType: LiveLrRecordType
  entries: LrEntryView[]
  programming: ProgrammingUploadView | null
}) {
  const [extraIds, setExtraIds] = useState<string[]>(() =>
    entries.length === 0 ? ["blank-initial"] : []
  )
  const addLabel =
    recordType === "APPLIED_ACTION_LEARNING"
      ? "Add another experiment"
      : recordType === "ACTION_LEARNING"
        ? "Add another task"
        : "Add another session"
  const removeLabel =
    recordType === "APPLIED_ACTION_LEARNING"
      ? "Remove this experiment"
      : recordType === "ACTION_LEARNING"
        ? "Remove this task"
        : "Remove this session"

  function addExtra() {
    setExtraIds((current) => [...current, newBlankId()])
  }

  function removeExtra(id: string) {
    setExtraIds((current) => {
      if (entries.length === 0 && current.length <= 1) return current
      return current.filter((item) => item !== id)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry) => (
        <LrEntryForm
          key={entry.id}
          courseId={courseId}
          recordType={recordType}
          entry={entry}
          canRemove={
            entry.status === "DRAFT" && entries.length + extraIds.length > 1
          }
          removeLabel={removeLabel}
        />
      ))}
      {extraIds.map((id) => (
        <LrEntryForm
          key={id}
          formKey={id}
          courseId={courseId}
          recordType={recordType}
          canRemove={entries.length > 0 || extraIds.length > 1}
          removeLabel={removeLabel}
          onRemove={() => removeExtra(id)}
        />
      ))}
      <div className="flex flex-col gap-2 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          One {nounFor(recordType)} stays on the page. Extra cards you add can
          be removed before submit. Marks stay with faculty.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit shrink-0"
          onClick={addExtra}
        >
          {addLabel}
        </Button>
      </div>
      {recordType === "APPLIED_ACTION_LEARNING" ? (
        <ProgrammingUploadCard courseId={courseId} upload={programming} />
      ) : null}
    </div>
  )
}

function nounFor(recordType: LiveLrRecordType) {
  if (recordType === "APPLIED_ACTION_LEARNING") return "experiment"
  if (recordType === "ACTION_LEARNING") return "task"
  return "session"
}

function newBlankId() {
  return `blank-${crypto.randomUUID()}`
}

function EmptyCard({ children }: { children: string }) {
  return (
    <div className="rounded-xl bg-card p-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
      {children}
    </div>
  )
}
