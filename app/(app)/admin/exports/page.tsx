import Link from "next/link"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { buttonVariants } from "@/components/ui/button"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"
import { listAcademicYears, listCampusOptions } from "@/lib/tiers/queries"
import { cn } from "@/lib/utils"
import { Suspense } from "react"

const selectClass =
  "h-8 w-full min-w-40 appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"

export default function AdminExportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; campus?: string }>
}) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader searchParams={searchParams} />
    </Suspense>
  )
}

async function Loader({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; campus?: string }>
}) {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN", "EXAM_CELL")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const query = await searchParams
  const [years, campuses] = await Promise.all([
    listAcademicYears(),
    listCampusOptions(),
  ])
  const campus = query.campus || session.campusId
  const year = query.year && years.includes(query.year) ? query.year : (years.at(-1) ?? "")
  const href =
    year && campus
      ? `/api/exports/exam-cell?year=${encodeURIComponent(year)}&campus=${campus}`
      : null

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Exam cell"
        description="Download the JSON file the exports worker wrote for a campus and academic year."
      />
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Campus</span>
          <select name="campus" defaultValue={campus} className={selectClass}>
            {campuses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Academic year</span>
          <select name="year" defaultValue={year} className={selectClass}>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "h-8")}>
          Choose
        </button>
        {href ? (
          <Link href={href} className={cn(buttonVariants(), "h-8")}>
            Download JSON
          </Link>
        ) : null}
      </form>
    </PageEnter>
  )
}
