"use client"

import { useMemo, useState } from "react"
import { SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { recordTypeLabel } from "@/lib/domain/record-types"
import type { FacultyInboxItem } from "@/lib/lr/types"
import { formatWhen } from "@/lib/ui/format"

export function FacultyInbox({ items }: { items: FacultyInboxItem[] }) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) =>
      [
        item.courseCode,
        item.courseTitle,
        item.studentName,
        item.studentEmail,
        recordTypeLabel(item.recordType),
        item.topic,
        item.title,
        item.taskTitle,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [items, query])

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-card p-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
        No submitted records yet. Scoring controls open in the next milestone.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search student, course, or record type"
          aria-label="Search submitted records"
          className="h-9 pl-9"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No submitted records match that search.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {item.courseCode}
                  </p>
                  <h2 className="mt-1 font-heading text-xl font-semibold">
                    {headline(item)}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.studentName} · {item.studentEmail}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{recordTypeLabel(item.recordType)}</Badge>
                  <Badge variant="outline">Submitted</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.courseTitle}
                {item.submittedAt ? ` · ${formatWhen(item.submittedAt)}` : ""}
              </p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {fieldsFor(item).map((field) => (
                  <div key={field.label} className={field.wide ? "sm:col-span-2" : ""}>
                    <dt className="eyebrow">{field.label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-foreground">
                      {field.value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted-foreground">
                Read only. Faculty scores and override reasons are not collected yet.
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function headline(item: FacultyInboxItem) {
  if (item.recordType === "CLASSROOM_LEARNING") return item.topic || "Classroom session"
  if (item.recordType === "APPLIED_ACTION_LEARNING") {
    return item.title || `Experiment ${item.experimentNo || ""}`.trim()
  }
  if (item.recordType === "ACTION_LEARNING") return item.taskTitle || "Workshop task"
  return recordTypeLabel(item.recordType)
}

function fieldsFor(item: FacultyInboxItem) {
  const field = (
    label: string,
    value: string,
    wide = false
  ): { label: string; value: string; wide: boolean } => ({
    label,
    value,
    wide,
  })
  const books = field("Books / Manuals Referred", item.booksManuals, true)
  if (item.recordType === "CLASSROOM_LEARNING") {
    return [
      field("Session date", item.sessionDate),
      field("Hours", item.hours),
      field("Topic", item.topic, true),
      field("Reflection", item.reflection, true),
      books,
    ]
  }
  if (item.recordType === "APPLIED_ACTION_LEARNING") {
    return [
      field("Experiment no.", item.experimentNo),
      field("Title", item.title),
      field("Concept", item.concept, true),
      field("Planning and execution", item.planning, true),
      field("Result and interpretation", item.result, true),
      field("Record", item.recordNotes, true),
      field("Viva", item.vivaNotes, true),
      books,
    ]
  }
  if (item.recordType === "ACTION_LEARNING") {
    return [
      field("Task", item.taskTitle, true),
      field("Hours contributed", item.hoursContributed),
      field(
        "Critical thinking / fieldwork / report",
        item.criticalThinking,
        true
      ),
      books,
    ]
  }
  return [books]
}
