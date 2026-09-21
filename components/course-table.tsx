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
import { recordTypeLabel } from "@/lib/domain/record-types"
import { combinationLabel } from "@/lib/domain/subject-map"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-48"

export function CourseTable({
  courses,
  hrefBase,
  empty,
}: {
  courses: CatalogCourse[]
  hrefBase?: string
  empty: string
}) {
  function hrefFor(course: CatalogCourse) {
    return hrefBase ? `${hrefBase}/${course.id}` : undefined
  }
  const [query, setQuery] = useState("")
  const [combination, setCombination] = useState("all")
  const [termId, setTermId] = useState("all")
  const [page, setPage] = useState(1)

  const terms = useMemo(() => {
    const seen = new Map<string, string>()
    for (const course of courses) {
      if (!seen.has(course.termId)) {
        seen.set(course.termId, `${course.termName} · ${course.academicYear}`)
      }
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }))
  }, [courses])

  const combinations = useMemo(() => {
    const codes = [...new Set(courses.map((course) => course.combinationCode))]
    return codes.sort((a, b) =>
      combinationLabel(a).localeCompare(combinationLabel(b))
    )
  }, [courses])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return courses.filter((course) => {
      if (combination !== "all" && course.combinationCode !== combination) {
        return false
      }
      if (termId !== "all" && course.termId !== termId) return false
      if (!needle) return true
      const haystack = [
        course.code,
        course.title,
        course.departmentName,
        course.programmeName,
        course.termName,
        course.academicYear,
        course.deliveryMode,
        combinationLabel(course.combinationCode),
        ...course.recordConfigs.map((config) =>
          recordTypeLabel(config.recordType)
        ),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [combination, courses, query, termId])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
  const filtersOn = query.trim() !== "" || combination !== "all" || termId !== "all"

  function updateQuery(value: string) {
    setQuery(value)
    setPage(1)
  }

  function clearFilters() {
    setQuery("")
    setCombination("all")
    setTermId("all")
    setPage(1)
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-xl bg-card px-6 py-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
        {empty}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search code, title, department, or combination"
            aria-label="Search courses"
            className="h-9 pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <select
            aria-label="Filter by combination"
            className={selectClass}
            value={combination}
            onChange={(event) => {
              setCombination(event.target.value)
              setPage(1)
            }}
          >
            <option value="all">All combinations</option>
            {combinations.map((code) => (
              <option key={code} value={code}>
                {combinationLabel(code)}
              </option>
            ))}
          </select>
          {terms.length > 1 ? (
            <select
              aria-label="Filter by term"
              className={selectClass}
              value={termId}
              onChange={(event) => {
                setTermId(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All terms</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <p className="shrink-0 text-sm text-muted-foreground lg:ml-auto">
          {filtered.length} of {courses.length}
        </p>
        {filtersOn ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
          <p className="text-sm font-medium">No courses match that search</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a course code, title, department, or combination name.
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
            {visible.map((course) => {
              const href = hrefFor?.(course)
              const body = <CourseCard course={course} />
              return href ? (
                <Link key={course.id} href={href} className="block">
                  {body}
                </Link>
              ) : (
                <div key={course.id}>{body}</div>
              )
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Course</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Department
                  </TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Combination</TableHead>
                  <TableHead>Required records</TableHead>
                  {hrefBase ? <TableHead className="w-10 pr-3" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((course) => {
                  const href = hrefFor?.(course)
                  return (
                    <TableRow
                      key={course.id}
                      className={href ? "hover:bg-muted/40" : undefined}
                    >
                      <TableCell className="pl-4">
                        {href ? (
                          <Link
                            href={href}
                            className="font-medium hover:underline"
                          >
                            {course.code}
                          </Link>
                        ) : (
                          <p className="font-medium">{course.code}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {course.title}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                        {course.departmentName}
                        <p className="text-xs">{course.programmeName}</p>
                      </TableCell>
                      <TableCell>
                        {course.termName}
                        <p className="text-xs text-muted-foreground">
                          {course.academicYear}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {combinationLabel(course.combinationCode)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {course.recordConfigs.map((config) => (
                            <Badge key={config.recordType} variant="secondary">
                              {recordTypeLabel(config.recordType)}{" "}
                              {config.frameworkWeightPercent}%
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      {hrefBase ? (
                        <TableCell className="pr-3">
                          {href ? (
                            <Link
                              href={href}
                              aria-label={`Open ${course.code}`}
                              className="inline-flex text-muted-foreground hover:text-foreground"
                            >
                              <ChevronRightIcon className="size-4" />
                            </Link>
                          ) : null}
                        </TableCell>
                      ) : null}
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

function CourseCard({ course }: { course: CatalogCourse }) {
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{course.code}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{course.title}</p>
        </div>
        <Badge variant="outline">
          {combinationLabel(course.combinationCode)}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {course.termName} · {course.academicYear}
      </p>
      <p className="text-sm text-muted-foreground">
        {course.departmentName} · {course.programmeName}
      </p>
      <div className="flex flex-wrap gap-1">
        {course.recordConfigs.map((config) => (
          <Badge key={config.recordType} variant="secondary">
            {recordTypeLabel(config.recordType)} {config.frameworkWeightPercent}%
          </Badge>
        ))}
      </div>
    </article>
  )
}
