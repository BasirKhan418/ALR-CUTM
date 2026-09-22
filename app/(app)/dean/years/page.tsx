import Link from "next/link"
import { ConstituteYearForm, TierSettingsForm } from "@/components/tier-forms"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { YearBoardTable } from "@/components/year-tables"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { buttonVariants } from "@/components/ui/button"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { campusAllowed } from "@/lib/tiers/access"
import {
  listAcademicYears,
  listCampusOptions,
  listCommitteeMembers,
  loadYearBoard,
} from "@/lib/tiers/queries"
import { readTierSettings } from "@/lib/tiers/settings"
import { firstShellHref } from "@/lib/domain/roles"
import { cn } from "@/lib/utils"
import { Suspense } from "react"

const selectClass =
  "h-8 w-full min-w-40 appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"

export default function DeanYearsPage({
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
  if (!hasRole(session, "DEAN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const query = await searchParams
  const [years, campuses, settings] = await Promise.all([
    listAcademicYears(),
    listCampusOptions(),
    readTierSettings(),
  ])
  const requestedCampus = query.campus || session.campusId
  const campusId =
    hasRole(session, "ADMIN") && campusAllowed(session, requestedCampus)
      ? requestedCampus
      : session.campusId
  const year =
    query.year && years.includes(query.year) ? query.year : (years.at(-1) ?? "")
  const rows = year ? await loadYearBoard(campusId, year) : []
  const members = await listCommitteeMembers(campusId)

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Year evaluation"
        description="Assign a committee, score the five-criterion rubric, and post 1 ALR credit for the academic year."
      />
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Campus</span>
          <select name="campus" defaultValue={campusId} className={selectClass}>
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
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
        <button type="submit" className={cn(buttonVariants(), "h-8")}>
          Show
        </button>
      </form>
      {query.campus && query.campus !== campusId ? (
        <p className="text-sm text-muted-foreground">
          Year evaluation stays on your campus.
        </p>
      ) : null}
      {year ? (
        <YearBoardTable rows={rows} hrefBase="/dean/years" />
      ) : (
        <p className="text-sm text-muted-foreground">
          Add a term before opening a year evaluation.
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
          <h2 className="font-heading text-lg font-semibold">Assign a committee</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Students who already have this year stay in the table.{" "}
            <Link href="/dean/program" className="underline">
              Programme board
            </Link>
          </p>
          {year ? (
            <ConstituteYearForm
              campusId={campusId}
              academicYear={year}
              students={rows
                .filter((row) => !row.evaluationId)
                .map((row) => ({ id: row.studentId, name: row.studentName }))}
              members={members}
            />
          ) : null}
        </section>
        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
          <h2 className="font-heading text-lg font-semibold">Rubric settings</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Both year-wise and programme workflows can use the 100-mark rubric.
          </p>
          <TierSettingsForm settings={settings} />
        </section>
      </div>
    </PageEnter>
  )
}
