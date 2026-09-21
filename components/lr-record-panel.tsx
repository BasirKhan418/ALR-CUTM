"use client"

import { useState } from "react"
import { LrEntryForm } from "@/components/lr-entry-form"
import { Button } from "@/components/ui/button"
import {
  isLiveLrRecordType,
  isStubLrRecordType,
  missingRecordTypeMessage,
  stubRecordMessage,
  type LiveLrRecordType,
} from "@/lib/domain/lr"
import { recordTypeLabel } from "@/lib/domain/record-types"
import type { RecordType } from "@/lib/domain/record-types"
import type { LrEntryView } from "@/lib/lr/types"

export function LrRecordPanel({
  courseId,
  recordType,
  required,
  entries,
}: {
  courseId: string
  recordType: RecordType
  required: boolean
  entries: LrEntryView[]
}) {
  if (!required) {
    return (
      <EmptyCard>{missingRecordTypeMessage(recordType)}</EmptyCard>
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
    />
  )
}

function LiveRecordList({
  courseId,
  recordType,
  entries,
}: {
  courseId: string
  recordType: LiveLrRecordType
  entries: LrEntryView[]
}) {
  const [extras, setExtras] = useState(0)
  const blanks = entries.length === 0 ? extras + 1 : extras
  const addLabel =
    recordType === "APPLIED_ACTION_LEARNING"
      ? "Add another experiment"
      : recordType === "ACTION_LEARNING"
        ? "Add another task"
        : "Add another session"

  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry) => (
        <LrEntryForm
          key={entry.id}
          courseId={courseId}
          recordType={recordType}
          entry={entry}
        />
      ))}
      {Array.from({ length: blanks }, (_, index) => (
        <LrEntryForm
          key={`blank-${index}`}
          courseId={courseId}
          recordType={recordType}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() => setExtras((count) => count + 1)}
      >
        {addLabel}
      </Button>
      <p className="text-xs text-muted-foreground">
        {recordTypeLabel(recordType)} accepts many entries this term. Marks stay
        with faculty.
      </p>
    </div>
  )
}

function EmptyCard({ children }: { children: string }) {
  return (
    <div className="rounded-xl bg-card p-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
      {children}
    </div>
  )
}
