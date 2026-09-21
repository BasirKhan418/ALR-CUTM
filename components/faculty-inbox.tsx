"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRightIcon, SearchIcon, XIcon } from "lucide-react"
import { ListPagination } from "@/components/list-pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { recordTypeLabel } from "@/lib/domain/record-types"
import type { FacultyInboxItem } from "@/lib/lr/types"
import { formatMarks } from "@/lib/scoring/format"
import { formatWhen } from "@/lib/ui/format"

const PAGE_SIZE = 10
const selectClass =
  "h-9 w-full min-w-0 appearance-none rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

type SortKey = "submitted" | "student" | "course" | "record" | "marks" | "status"

export function FacultyInbox({
  items,
  courses,
  selectedCourseId = "",
}: {
  items: FacultyInboxItem[]
  courses: { id: string; code: string; title: string }[]
  selectedCourseId?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [recordFilter, setRecordFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sort, setSort] = useState<SortKey>("submitted")
  const [page, setPage] = useState(1)

  const recordTypes = useMemo(
    () => [...new Set(items.map((item) => item.recordType))],
    [items]
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const next = items.filter((item) => {
      if (recordFilter !== "all" && item.recordType !== recordFilter) return false
      if (statusFilter === "scored" && !item.scored) return false
      if (statusFilter === "pending" && item.scored) return false
      if (!needle) return true
      return [
        item.courseCode,
        item.courseTitle,
        item.studentName,
        item.studentEmail,
        recordTypeLabel(item.recordType),
        headline(item),
        item.facultyRemarks,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    })
    next.sort((a, b) => compareItems(a, b, sort))
    return next
  }, [items, query, recordFilter, sort, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
  const filtersOn =
    query.trim() !== "" ||
    selectedCourseId !== "" ||
    recordFilter !== "all" ||
    statusFilter !== "all"

  function resetPage() {
    setPage(1)
  }

  function clearFilters() {
    setQuery("")
    setRecordFilter("all")
    setStatusFilter("all")
    setPage(1)
    if (selectedCourseId) router.push("/faculty/inbox")
  }

  if (items.length === 0 && !selectedCourseId) {
    return (
      <div className="rounded-xl bg-card px-6 py-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
        No submitted records yet. Ask students to submit Classroom, Applied, or
        Workshop entries.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
        <div className="grid grid-cols-1 gap-2 min-[30rem]:grid-cols-2 xl:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1.5 min-[30rem]:col-span-2 xl:col-span-1">
            <span className="eyebrow">Course</span>
            <select
              aria-label="Filter by course"
              className={selectClass}
              value={selectedCourseId}
              onChange={(event) => {
                const next = event.target.value
                router.push(next ? `/faculty/inbox?course=${next}` : "/faculty/inbox")
              }}
            >
              <option value="">All assigned courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id} title={course.title}>
                  {course.code}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="eyebrow">Record type</span>
            <select
              aria-label="Filter by record type"
              className={selectClass}
              value={recordFilter}
              onChange={(event) => {
                setRecordFilter(event.target.value)
                resetPage()
              }}
            >
              <option value="all">All record types</option>
              {recordTypes.map((type) => (
                <option key={type} value={type}>
                  {recordTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="eyebrow">Score status</span>
            <select
              aria-label="Filter by score status"
              className={selectClass}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                resetPage()
              }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Needs score</option>
              <option value="scored">Scored</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="eyebrow">Sort</span>
            <select
              aria-label="Sort submitted records"
              className={selectClass}
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              <option value="submitted">Newest submitted</option>
              <option value="student">Student</option>
              <option value="course">Course</option>
              <option value="record">Record type</option>
              <option value="marks">Marks</option>
              <option value="status">Score status</option>
            </select>
          </label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                resetPage()
              }}
              placeholder="Search student, course, or title"
              aria-label="Search submitted records"
              className="h-9 pl-9"
            />
          </div>
          <p className="shrink-0 text-sm text-muted-foreground">
            {filtered.length} of {items.length}
          </p>
          {filtersOn ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <XIcon className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
          <p className="text-sm font-medium">No records match those filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another course, record type, or student name.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
            <Table className="min-w-[56rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Entry marks</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                  <TableHead className="pr-3">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((item) => (
                  <TableRow
                    key={item.id}
                    className="relative cursor-pointer hover:bg-muted/40"
                  >
                    <TableCell className="pl-4">
                      <Link
                        href={actionHref(item)}
                        className="font-medium after:absolute after:inset-0 hover:underline"
                      >
                        {item.studentName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {item.studentEmail}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{item.courseCode}</p>
                      <p className="max-w-48 truncate text-xs text-muted-foreground">
                        {item.courseTitle}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{headline(item)}</p>
                      <p className="text-xs text-muted-foreground">
                        {recordTypeLabel(item.recordType)}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <MarksCell item={item} />
                    </TableCell>
                    <TableCell>
                      <SubjectCell item={item} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.scored ? "secondary" : "outline"}>
                        {item.scored ? "Scored" : "Needs score"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {item.submittedAt ? formatWhen(item.submittedAt) : "—"}
                    </TableCell>
                    <TableCell className="pr-3">
                      <Link
                        href={actionHref(item)}
                        className="relative z-10 inline-flex items-center gap-1 text-sm font-medium hover:underline"
                      >
                        {item.recordType === "CLASSROOM_LEARNING"
                          ? "Classroom"
                          : item.scored
                            ? "Edit"
                            : "Score"}
                        <ChevronRightIcon className="size-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            page={currentPage}
            pageCount={pageCount}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPage={setPage}
          />
        </>
      )}
    </div>
  )
}

function MarksCell({ item }: { item: FacultyInboxItem }) {
  if (item.entryTotal === null || item.entryMax === null) {
    return <p className="text-sm text-muted-foreground">Not scored</p>
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="font-medium">
        {formatMarks(item.entryTotal)} / {item.entryMax}
      </p>
      {item.criterionMarks.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {item.criterionMarks
            .filter((mark) => Number.isFinite(mark.value))
            .map((mark) => `${shortLabel(mark.label)} ${formatMarks(mark.value)}`)
            .join(" · ")}
        </p>
      ) : null}
    </div>
  )
}

function SubjectCell({ item }: { item: FacultyInboxItem }) {
  if (item.subjectNormalized === null || item.subjectFramework === null) {
    return <p className="text-sm text-muted-foreground">—</p>
  }
  return (
    <p className="text-sm">
      {formatMarks(item.subjectNormalized)} / {item.subjectFramework}
    </p>
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

function actionHref(item: FacultyInboxItem) {
  if (item.recordType === "CLASSROOM_LEARNING") {
    return `/faculty/courses/${item.courseId}?tab=classroom`
  }
  return `/faculty/inbox/${item.id}`
}

function shortLabel(label: string) {
  if (label.startsWith("Critical")) return "Fieldwork"
  if (label.startsWith("Presentation")) return "Viva"
  if (label.startsWith("Planning")) return "Planning"
  if (label.startsWith("Result")) return "Result"
  return label
}

function compareItems(a: FacultyInboxItem, b: FacultyInboxItem, sort: SortKey) {
  if (sort === "student") return a.studentName.localeCompare(b.studentName)
  if (sort === "course") return a.courseCode.localeCompare(b.courseCode)
  if (sort === "record") {
    return recordTypeLabel(a.recordType).localeCompare(recordTypeLabel(b.recordType))
  }
  if (sort === "marks") {
    return (b.entryTotal ?? -1) - (a.entryTotal ?? -1)
  }
  if (sort === "status") {
    return Number(a.scored) - Number(b.scored)
  }
  return (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")
}
