import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ListPagination({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageCount: number
  pageSize: number
  total: number
  onPage: (page: number) => void
}) {
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pages = visiblePages(page, pageCount)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      {pageCount > 1 ? (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeftIcon className="size-3.5" />
            Previous
          </Button>
          {pages.map((item, index) =>
            item === "…" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-1.5 text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={item}
                type="button"
                variant={item === page ? "default" : "ghost"}
                size="sm"
                onClick={() => onPage(item)}
              >
                {item}
              </Button>
            )
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPage(page + 1)}
          >
            Next
            <ChevronRightIcon className="size-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function visiblePages(page: number, pageCount: number): Array<number | "…"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  const items = new Set<number>([1, pageCount, page, page - 1, page + 1])
  const sorted = [...items]
    .filter((item) => item >= 1 && item <= pageCount)
    .sort((a, b) => a - b)

  const result: Array<number | "…"> = []
  for (const item of sorted) {
    const last = result[result.length - 1]
    if (typeof last === "number" && item - last > 1) result.push("…")
    result.push(item)
  }
  return result
}
