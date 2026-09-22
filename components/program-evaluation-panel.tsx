import Link from "next/link"
import {
  CumulateForm,
  ExportProgramForm,
  RubricForm,
  SignProgramForm,
} from "@/components/tier-forms"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { CUMULATE_FORMULA } from "@/lib/domain/cumulate"
import {
  YEAR_EVAL_STATUSES,
  exportStatusLabel,
  yearStatusLabel,
} from "@/lib/domain/tiers"
import type { ProgramDetail, ProgramFlags } from "@/lib/tiers/types"
import type { TierSettings } from "@/lib/tiers/settings"
import { formatWhen } from "@/lib/ui/format"
import { cn } from "@/lib/utils"

export function ProgramEvaluationPanel({
  detail,
  flags,
  settings,
  backHref,
  backLabel,
}: {
  detail: ProgramDetail
  flags: ProgramFlags
  settings: TierSettings
  backHref: string
  backLabel: string
}) {
  const download =
    detail.exportStatus === "READY"
      ? `/api/exports/exam-cell?campus=${detail.campusId}&scope=program&student=${detail.studentId}`
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
          {detail.programmeName} · {detail.durationYears} years · {detail.campusName}.{" "}
          {detail.creditsPosted} compulsory ALR credit
          {detail.creditsPosted === 1 ? "" : "s"} posted. Programme evaluation
          cumulates signed years. It is a committee workflow, separate from the
          credit ledger.
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
        <h2 className="font-heading text-lg font-semibold">Cumulated mark</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{CUMULATE_FORMULA}</p>
        <p className="mt-3 text-sm leading-6">{detail.formula}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Stored cumulation"
            value={detail.cumulatedMark === null ? "Not stored" : String(detail.cumulatedMark)}
          />
          <Stat
            label="Final mark"
            value={detail.finalMark === null ? "Not stored" : String(detail.finalMark)}
          />
          <Stat
            label="Scale"
            value={String(detail.scaleUsed ?? settings.programCumulateScale)}
          />
        </dl>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Year</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Rubric</th>
                <th className="py-2 font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {detail.years.map((year) => (
                <tr key={year.id} className="border-t border-border/70">
                  <td className="py-2 pr-3">{year.academicYear}</td>
                  <td className="py-2 pr-3">{yearStatusLabel(year.status)}</td>
                  <td className="py-2 pr-3">
                    {year.rubricTotal === null ? "—" : `${year.rubricTotal} / 100`}
                  </td>
                  <td className="py-2">{year.creditPosted ? "1 posted" : "Not posted"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {flags.canCumulate ? (
          <div className="mt-4">
            <CumulateForm id={detail.id} />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-heading text-lg font-semibold">Five-criterion rubric</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Coverage of Courses, Coverage of Components, Quality of Content, Aesthetics,
          and Presentation & Discussion. 20 marks each.
        </p>
        {settings.programWiseUsesFiveCriterion ? (
          flags.canScore ? (
            <div className="mt-4">
              <RubricForm
                kind="program"
                id={detail.id}
                rows={detail.rubric}
                comments={detail.comments}
              />
            </div>
          ) : (
            <RubricReadout rows={detail.rubric} total={detail.rubricTotal} comments={detail.comments} />
          )
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            The programme five-criterion rubric is turned off. The final mark follows the cumulated year mean.
          </p>
        )}
        {flags.canSign ? (
          <div className="mt-4">
            <SignProgramForm id={detail.id} />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <h2 className="font-heading text-lg font-semibold">Exam cell</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Status: {exportStatusLabel(detail.exportStatus)}. Committee:{" "}
          {detail.committeeNames.join(", ") || "Not assigned"}.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {flags.canExport ? <ExportProgramForm id={detail.id} /> : null}
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

      <SignoffList signoffs={detail.signoffs} />
    </div>
  )
}

function RubricReadout({
  rows,
  total,
  comments,
}: {
  rows: ProgramDetail["rubric"]
  total: number | null
  comments: string
}) {
  return (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <tbody>
            {rows.map((row) => (
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
      </div>
      <p className="mt-3 text-sm">Total {total === null ? "—" : `${total} / 100`}.</p>
      {comments ? <p className="mt-2 text-sm text-muted-foreground">{comments}</p> : null}
    </div>
  )
}

function SignoffList({ signoffs }: { signoffs: ProgramDetail["signoffs"] }) {
  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <h2 className="font-heading text-lg font-semibold">Sign-offs</h2>
      {signoffs.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No sign-offs yet.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {signoffs.map((step) => (
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
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  )
}
