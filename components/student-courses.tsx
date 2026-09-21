"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { SearchIcon, XIcon } from "lucide-react"
import { ListPagination } from "@/components/list-pagination"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CatalogCourse } from "@/lib/catalog/queries"
import { recordTypeLabel } from "@/lib/domain/record-types"
import { combinationLabel } from "@/lib/domain/subject-map"
import type { LrEntryView } from "@/lib/lr/types"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 9

export function StudentCourses({
  courses,
  entries,
}: {
  courses: CatalogCourse[]
  entries: LrEntryView[]
}) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return courses
    return courses.filter((course) => {
      const haystack = [
        course.code,
        course.title,
        course.departmentName,
        course.programmeName,
        course.termName,
        combinationLabel(course.combinationCode),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [courses, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  if (courses.length === 0) {
    return (
      <div className="rounded-xl bg-card px-6 py-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
        You are not enrolled in a course this term. Ask your faculty to add you.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:p-4">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search your courses"
            aria-label="Search courses"
            className="h-9 pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {courses.length}
        </p>
        {query.trim() ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("")
              setPage(1)
            }}
          >
            <XIcon className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
          <p className="text-sm font-medium">No courses match that search</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a course code or title.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((course) => {
              const mine = entries.filter((entry) => entry.courseId === course.id)
              const submitted = mine.filter((entry) => entry.status === "SUBMITTED").length
              const drafts = mine.filter((entry) => entry.status === "DRAFT").length
              return (
                <article
                  key={course.id}
                  className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {course.code}
                      </p>
                      <h2 className="mt-1 font-heading text-lg font-semibold sm:text-xl">
                        {course.title}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {course.termName} · {course.departmentName}
                      </p>
                    </div>
                    <Badge variant={submitted > 0 ? "default" : "outline"}>
                      {statusLabel(submitted, drafts)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{combinationLabel(course.combinationCode)}</Badge>
                    {course.recordConfigs.map((config) => (
                      <Badge key={config.recordType} variant="secondary">
                        {recordTypeLabel(config.recordType)}
                      </Badge>
                    ))}
                  </div>
                  <Link
                    href={`/student/courses/${course.id}`}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "mt-auto h-9 w-full"
                    )}
                  >
                    Submit LR
                  </Link>
                </article>
              )
            })}
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

function statusLabel(submitted: number, drafts: number) {
  if (submitted === 0 && drafts === 0) return "Open"
  if (submitted > 0 && drafts > 0) return `${submitted} submitted · ${drafts} draft`
  if (submitted > 0) return `${submitted} submitted`
  return `${drafts} draft`
}
