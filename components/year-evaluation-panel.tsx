import Link from "next/link"
import {
  ExportYearForm,
  PostCreditForm,
  RubricForm,
  SignCoForm,
  SignPoForm,
  SignYearForm,
} from "@/components/tier-forms"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  BASKET_LABEL,
  YEAR_EVAL_STATUSES,
  exportStatusLabel,
  yearStatusLabel,
} from "@/lib/domain/tiers"
import type { TierSettings } from "@/lib/tiers/settings"
import type { YearDetail, YearFlags } from "@/lib/tiers/types"
import { formatWhen } from "@/lib/ui/format"
import { cn } from "@/lib/utils"

export function YearEvaluationPanel({
  detail,
  flags,
  settings,
  backHref,
  backLabel,
}: {
  detail: YearDetail
  flags: YearFlags
  settings: TierSettings
  backHref: string
  backLabel: string
}) {
  const download =
    detail.exportStatus === "READY"
      ? `/api/exports/exam-cell?year=${encodeURIComponent(detail.academicYear)}&campus=${detail.campusId}`
      : null

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {detail.studentName}
          </h1>
          <Badge>{yearStatusLabel(detail.status)}</Badge>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {detail.academicYear} · {detail.programmeName} · {detail.campusName}
          {detail.registrationNo ? ` · ${detail.registrationNo}` : ""}
        </p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {YEAR_EVAL_STATUSES.map((status) => (
          <li key={status}>
            <Badge variant={status === detail.status ? "default" : "outline"}>
              {yearStatusLabel(status)}
            </Badge>
          </li>
        ))}
      </ol>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-heading text-lg font-semibold">Compiled records</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Committee: {detail.committeeNames.join(", ") || "Not assigned"}.
        </p>
        {detail.components.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No learning records or deliverables were filed for this academic year.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {detail.components.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link href={item.href} className="text-sm font-medium hover:underline">
                  {item.label}
                </Link>
                <span className="block text-sm text-muted-foreground">{item.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-heading text-lg font-semibold">Five-criterion rubric</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Coverage of Courses, Coverage of Components, Quality of Content, Aesthetics,
          and Presentation & Discussion. 20 marks each, 100 total.
        </p>
        {settings.yearWiseUsesFiveCriterion ? (
          flags.canScore ? (
            <div className="mt-4">
              <RubricForm
                kind="year"
                id={detail.id}
                rows={detail.rubric}
                comments={detail.comments}
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <tbody>
                  {detail.rubric.map((row) => (
                    <tr key={row.criterionId} className="border-t border-border/70">
                      <td className="py-2 pr-3">{row.label}</td>
                      <td className="py-2 pr-3">
                        {row.marks === null ? "—" : `${row.marks} / ${row.max}`}
                      </td>
                      <td className="py-2 text-muted-foreground">{row.comment || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm">
                Total {detail.rubricTotal === null ? "—" : `${detail.rubricTotal} / 100`}.
              </p>
              {detail.comments ? (
                <p className="mt-2 text-sm text-muted-foreground">{detail.comments}</p>
              ) : null}
            </div>
          )
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            The year-wise five-criterion rubric is turned off.
          </p>
        )}
        {flags.canSign ? (
          <div className="mt-4">
            <SignYearForm id={detail.id} />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-heading text-lg font-semibold">PO/PSO attainment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed by the Mentor. Course faculty cannot sign this sheet.
        </p>
        {detail.mentorSigned ? (
          <p className="mt-3 text-sm leading-6">
            {detail.mentorName}
            {detail.mentorAt ? ` · ${formatWhen(detail.mentorAt)}` : ""}
            <span className="block text-muted-foreground">{detail.mentorSheet}</span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Not signed.</p>
        )}
        {flags.canSignPo ? (
          <div className="mt-4">
            <SignPoForm id={detail.id} />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-heading text-lg font-semibold">CO attainment</h2>
        {detail.courses.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No course enrollments for this academic year.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {detail.courses.map((course) => (
              <li key={course.id} className="text-sm">
                <p className="font-medium">
                  {course.code} · {course.title}
                </p>
                {course.coSigned ? (
                  <p className="text-muted-foreground">
                    Signed by {course.coSignedBy}
                    {course.coAt ? ` · ${formatWhen(course.coAt)}` : ""}
                    {course.coSheet ? ` · ${course.coSheet}` : ""}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Missing</p>
                )}
                {flags.coCourseIds.includes(course.id) ? (
                  <div className="mt-2">
                    <SignCoForm
                      yearId={detail.id}
                      courseId={course.id}
                      courseCode={course.code}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-heading text-lg font-semibold">{BASKET_LABEL}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {detail.creditPosted
            ? "1 ALR credit is posted for this year."
            : "No ALR credit is posted for this year yet."}{" "}
          Exam cell: {exportStatusLabel(detail.exportStatus)}.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {flags.canPostCredit ? <PostCreditForm id={detail.id} /> : null}
          {flags.canExport ? <ExportYearForm id={detail.id} /> : null}
          {download ? (
            <Link
              href={download}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
            >
              Download JSON
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-heading text-lg font-semibold">Sign-offs</h2>
        {detail.signoffs.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No sign-offs yet.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {detail.signoffs.map((step) => (
              <li key={step.id} className="text-sm leading-6">
                <span className="font-medium">{step.role}</span>
                {" · "}
                {step.actorName}
                {step.at ? ` · ${formatWhen(step.at)}` : ""}
                {step.reason ? (
                  <span className="block text-muted-foreground">{step.reason}</span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
