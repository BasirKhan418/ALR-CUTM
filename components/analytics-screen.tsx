import { connection } from "next/server"
import { AnalyticsPanel } from "@/components/analytics-panel"
import { BookletRequestForm } from "@/components/export-forms"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { clampAnalyticsScope, type AnalyticsAudience } from "@/lib/domain/analytics"
import { firstShellHref } from "@/lib/domain/roles"
import { listAnalyticsChoices, listScopedStudents } from "@/lib/exports/queries"
import { listAcademicYears } from "@/lib/tiers/queries"
import { loadAnalytics } from "@/lib/services/analytics"

export async function AnalyticsScreen({
  audience,
  pathname,
  searchParams,
}: {
  audience: AnalyticsAudience
  pathname: string
  searchParams: Promise<{
    campus?: string
    department?: string
    term?: string
    programme?: string
  }>
}) {
  await connection()
  const session = await requireSession()
  const allowed =
    audience === "ADMIN"
      ? hasRole(session, "ADMIN")
      : audience === "DEAN"
        ? hasRole(session, "DEAN")
        : hasRole(session, "HOD")
  if (!allowed) return <Forbidden homeHref={firstShellHref(session.roles)} />

  const query = await searchParams
  const scope = clampAnalyticsScope({
    audience,
    sessionCampusId: session.campusId,
    sessionDepartmentId: session.departmentId,
    campusId: query.campus,
    departmentId: query.department,
    termId: query.term,
    programmeId: query.programme,
  })
  const [choices, snapshot, years, students] = await Promise.all([
    listAnalyticsChoices(scope.allCampuses ? undefined : scope.campusId),
    loadAnalytics(scope),
    audience === "HOD" ? listAcademicYears() : Promise.resolve([]),
    audience === "HOD"
      ? listScopedStudents({
          userId: session.userId,
          campusId: session.campusId,
          departmentId: session.departmentId,
          audience: "HOD",
        })
      : Promise.resolve([]),
  ])
  const campusName =
    choices.campuses.find((item) => item.id === session.campusId)?.name ?? "Campus"

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Submissions, scores, overdue sign-offs, open cases, ALR credits, and workshop hours for one campus."
      />
      <AnalyticsPanel
        action={pathname}
        audience={audience}
        snapshot={snapshot}
        campuses={choices.campuses}
        departments={choices.departments}
        terms={choices.terms}
        programmes={choices.programmes}
        campus={scope.allCampuses ? "all" : (scope.campusId ?? session.campusId)}
        department={scope.departmentId ?? ""}
        term={scope.termId ?? ""}
        programme={scope.programmeId ?? ""}
        lockedCampusName={campusName}
      />
      {audience === "HOD" ? (
        <section className="max-w-md rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <BookletRequestForm years={years} students={students} />
        </section>
      ) : null}
    </PageEnter>
  )
}
