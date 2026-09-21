"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
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
import type { CatalogCourse } from "@/lib/catalog/queries"
import type { DeliverableStatus } from "@/lib/domain/deliverable"
import { recordTypeLabel, type RecordType } from "@/lib/domain/record-types"
import { combinationLabel } from "@/lib/domain/subject-map"
import type { LrEntryView } from "@/lib/lr/types"
import { formatMarks } from "@/lib/scoring/format"
import type { SubjectScoreView } from "@/lib/scoring/types"

const PAGE_SIZE = 10
const selectClass =
  "h-9 w-full min-w-0 appearance-none rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

type SortKey = "code" | "title" | "status" | "progress" | "score"
type StatusFilter = "all" | "open" | "draft" | "submitted"

export type StudentDeliverableSummary = {
  courseId: string
  recordType: RecordType
  status: DeliverableStatus
}

export function StudentCourses({
  courses,
  entries,
  scores = [],
  deliverables = [],
}: {
  courses: CatalogCourse[]
  entries: LrEntryView[]
  scores?: SubjectScoreView[]
  deliverables?: StudentDeliverableSummary[]
}) {
  const [query, setQuery] = useState("")
  const [combination, setCombination] = useState("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sort, setSort] = useState<SortKey>("code")
  const [page, setPage] = useState(1)

  const combinations = useMemo(() => {
    const codes = [...new Set(courses.map((course) => course.combinationCode))]
    return codes.sort((a, b) =>
      combinationLabel(a).localeCompare(combinationLabel(b))
    )
  }, [courses])

  const rows = useMemo(
    () =>
      courses.map((course) =>
        summarizeCourse(course, entries, scores, deliverables)
      ),
    [courses, entries, scores, deliverables]
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const next = rows.filter((row) => {
      if (combination !== "all" && row.course.combinationCode !== combination) {
        return false
      }
      if (statusFilter !== "all" && row.status !== statusFilter) return false
      if (!needle) return true
      return [
        row.course.code,
        row.course.title,
        row.course.departmentName,
        row.course.programmeName,
        row.course.termName,
        combinationLabel(row.course.combinationCode),
        ...row.course.recordConfigs.map((config) =>
          recordTypeLabel(config.recordType)
        ),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    })
    next.sort((a, b) => compareRows(a, b, sort))
    return next
  }, [combination, query, rows, sort, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
  const filtersOn =
    query.trim() !== "" || combination !== "all" || statusFilter !== "all"

  function resetPage() {
    setPage(1)
  }

  function clearFilters() {
    setQuery("")
    setCombination("all")
    setStatusFilter("all")
    setSort("code")
    setPage(1)
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-xl bg-card px-6 py-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
        You are not enrolled in a course this term. Ask your faculty to add you.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
        <div className="grid grid-cols-1 gap-2 min-[30rem]:grid-cols-2 xl:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="eyebrow">Combination</span>
            <select
              aria-label="Filter by combination"
              className={selectClass}
              value={combination}
              onChange={(event) => {
                setCombination(event.target.value)
                resetPage()
              }}
            >
              <option value="all">All combinations</option>
              {combinations.map((code) => (
                <option key={code} value={code}>
                  {combinationLabel(code)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="eyebrow">Progress</span>
            <select
              aria-label="Filter by progress"
              className={selectClass}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter)
                resetPage()
              }}
            >
              <option value="all">All courses</option>
              <option value="open">Not started</option>
              <option value="draft">In draft</option>
              <option value="submitted">Submitted</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="eyebrow">Sort</span>
            <select
              aria-label="Sort courses"
              className={selectClass}
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              <option value="code">Course code</option>
              <option value="title">Title</option>
              <option value="progress">Most submitted</option>
              <option value="score">Highest score</option>
              <option value="status">Progress</option>
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
              placeholder="Search code, title, department, or combination"
              aria-label="Search your courses"
              className="h-9 pl-9"
            />
          </div>
          <p className="shrink-0 text-sm text-muted-foreground">
            {filtered.length} of {courses.length}
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
          <p className="text-sm font-medium">No courses match those filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a course code, title, or combination name.
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
          <div className="grid gap-3 md:hidden">
            {visible.map((row) => (
              <StudentCourseCard key={row.course.id} row={row} />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10 md:block">
            <Table className="min-w-[52rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Course</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Combination</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Scores</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-3">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => {
                  const href = `/student/courses/${row.course.id}`
                  return (
                    <TableRow
                      key={row.course.id}
                      className="relative cursor-pointer hover:bg-muted/40"
                    >
                      <TableCell className="pl-4">
                        <Link
                          href={href}
                          className="font-medium after:absolute after:inset-0 hover:underline"
                        >
                          {row.course.code}
                        </Link>
                        <p className="max-w-64 truncate text-xs text-muted-foreground">
                          {row.course.title}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{row.course.termName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.course.departmentName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {combinationLabel(row.course.combinationCode)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="text-sm font-medium">
                          {row.submitted} submitted
                          {row.drafts > 0 ? ` · ${row.drafts} draft` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.course.recordConfigs
                            .map((config) => recordTypeLabel(config.recordType))
                            .join(" · ")}
                        </p>
                      </TableCell>
                      <TableCell>
                        <ScoreCell scores={row.scores} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>
                          {statusLabel(row)}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-3">
                        <Link
                          href={href}
                          className="relative z-10 inline-flex items-center gap-1 text-sm font-medium hover:underline"
                        >
                          Open
                          <ChevronRightIcon className="size-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
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

function StudentCourseCard({ row }: { row: CourseRow }) {
  const href = `/student/courses/${row.course.id}`
  return (
    <article className="relative flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={href}
            className="font-semibold after:absolute after:inset-0 hover:underline"
          >
            {row.course.code}
          </Link>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {row.course.title}
          </p>
        </div>
        <Badge variant={statusVariant(row.status)}>{statusLabel(row)}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {row.course.termName} · {row.course.departmentName}
      </p>
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline">
          {combinationLabel(row.course.combinationCode)}
        </Badge>
        {row.course.recordConfigs.map((config) => (
          <Badge key={config.recordType} variant="secondary">
            {recordTypeLabel(config.recordType)}
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          {row.submitted} submitted
          {row.drafts > 0 ? ` · ${row.drafts} draft` : ""}
        </p>
        <ScoreCell scores={row.scores} />
      </div>
      <Link
        href={href}
        className="relative z-10 inline-flex w-fit items-center gap-1 text-sm font-medium hover:underline"
      >
        Submit LR
        <ChevronRightIcon className="size-3.5" />
      </Link>
    </article>
  )
}

function ScoreCell({ scores }: { scores: SubjectScoreView[] }) {
  const ready = scores.filter((score) => score.computedAt)
  if (ready.length === 0) {
    return <p className="text-sm text-muted-foreground">Not scored</p>
  }
  return (
    <div className="flex flex-col gap-0.5">
      {ready.map((score) => (
        <p key={score.recordType} className="text-sm">
          <span className="font-medium">
            {formatMarks(score.normalized)} / {score.frameworkMarks}
          </span>
          <span className="ml-1 text-xs text-muted-foreground">
            {recordTypeLabel(score.recordType)}
          </span>
        </p>
      ))}
    </div>
  )
}

type CourseRow = {
  course: CatalogCourse
  submitted: number
  drafts: number
  scores: SubjectScoreView[]
  status: Exclude<StatusFilter, "all">
  scoreTotal: number
}

function summarizeCourse(
  course: CatalogCourse,
  entries: LrEntryView[],
  scores: SubjectScoreView[],
  deliverables: StudentDeliverableSummary[]
): CourseRow {
  const mine = entries.filter((entry) => entry.courseId === course.id)
  const mineDeliverables = deliverables.filter(
    (item) => item.courseId === course.id
  )
  const submitted =
    mine.filter((entry) => entry.status === "SUBMITTED").length +
    mineDeliverables.filter((item) =>
      (
        [
          "SUBMITTED",
          "APPROVED",
          "SUBMITTED_FOR_EVALUATION",
        ] as DeliverableStatus[]
      ).includes(item.status)
    ).length
  const drafts =
    mine.filter((entry) => entry.status === "DRAFT").length +
    mineDeliverables.filter(
      (item) => item.status === "DRAFT" || item.status === "RETURNED"
    ).length
  const requiredTypes = new Set(
    course.recordConfigs.map((config) => config.recordType)
  )
  const courseScores = scores.filter(
    (score) =>
      score.courseId === course.id && requiredTypes.has(score.recordType)
  )
  const status: CourseRow["status"] =
    submitted === 0 && drafts === 0
      ? "open"
      : submitted > 0 && drafts === 0
        ? "submitted"
        : "draft"
  return {
    course,
    submitted,
    drafts,
    scores: courseScores,
    status,
    scoreTotal: courseScores.reduce(
      (sum, score) => sum + (score.computedAt ? score.normalized : 0),
      0
    ),
  }
}

function statusLabel(row: CourseRow) {
  if (row.status === "open") return "Not started"
  if (row.status === "submitted") {
    return row.submitted === 1 ? "1 submitted" : `${row.submitted} submitted`
  }
  if (row.submitted > 0) {
    return `${row.submitted} submitted · ${row.drafts} draft`
  }
  return row.drafts === 1 ? "1 draft" : `${row.drafts} draft`
}

function statusVariant(status: CourseRow["status"]) {
  if (status === "submitted") return "default" as const
  if (status === "draft") return "secondary" as const
  return "outline" as const
}

function compareRows(a: CourseRow, b: CourseRow, sort: SortKey) {
  if (sort === "title") return a.course.title.localeCompare(b.course.title)
  if (sort === "progress") return b.submitted - a.submitted
  if (sort === "score") return b.scoreTotal - a.scoreTotal
  if (sort === "status") {
    return statusRank(a.status) - statusRank(b.status)
  }
  return a.course.code.localeCompare(b.course.code)
}

function statusRank(status: CourseRow["status"]) {
  if (status === "open") return 0
  if (status === "draft") return 1
  return 2
}
