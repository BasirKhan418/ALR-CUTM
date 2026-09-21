"use client"

import { useActionState } from "react"
import Link from "next/link"
import { CircleAlertIcon } from "lucide-react"
import {
  excludePlagiarismMatch,
  type PlagiarismFormState,
} from "@/lib/actions/plagiarism"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  documentTypeLabel,
  reportStatusLabel,
} from "@/lib/domain/plagiarism"
import type { PlagiarismReportView } from "@/lib/plagiarism/types"

const INITIAL: PlagiarismFormState = { ok: false }

export function PlagiarismReportPanel({
  report,
  canExclude = false,
  caseHref,
}: {
  report: PlagiarismReportView
  canExclude?: boolean
  caseHref?: string
}) {
  const excluded = new Set(report.exclusions.map((item) => item.matchId))

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Integrity report</p>
          <h2 className="mt-1 font-heading text-lg font-semibold">
            {documentTypeLabel(report.documentType)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tool {report.tool} · job {report.jobName} · threshold{" "}
            {report.thresholdApplied}%
          </p>
        </div>
        <Badge variant={report.status === "FLAGGED" ? "default" : "outline"}>
          {reportStatusLabel(report.status)}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Score after exclusions"
          value={report.score === null ? "Scanning" : `${report.score}%`}
        />
        <Stat
          label="Raw overlap"
          value={report.rawScore === null ? "—" : `${report.rawScore}%`}
        />
        <Stat label="Matches" value={String(report.matches.length)} />
      </div>
      {report.caseId && caseHref ? (
        <Link href={caseHref} className="text-sm font-medium hover:underline">
          Open integrity case
        </Link>
      ) : null}
      {report.matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {report.status === "PENDING"
            ? "The scan is queued. Refresh after the worker finishes."
            : "No overlapping sources were stored."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {report.matches.map((match) => (
            <li
              key={match.id}
              className="rounded-lg px-3 py-3 ring-1 ring-foreground/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{match.sourceLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    Overlap {match.overlap}%
                    {excluded.has(match.id) ? " · excluded from the flag score" : ""}
                  </p>
                  {match.excerpt ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {match.excerpt}
                    </p>
                  ) : null}
                </div>
                {excluded.has(match.id) ? (
                  <Badge variant="outline">Excluded</Badge>
                ) : null}
              </div>
              {canExclude && !excluded.has(match.id) ? (
                <ExcludeForm reportId={report.id} matchId={match.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {report.exclusions.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium">Certified exclusions</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {report.exclusions.map((item) => (
              <li key={item.matchId} className="text-sm text-muted-foreground">
                {item.reason}
                {item.certificateFileId ? (
                  <>
                    {" · "}
                    <a
                      href={`/api/files/${item.certificateFileId}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      Certificate
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function ExcludeForm({
  reportId,
  matchId,
}: {
  reportId: string
  matchId: string
}) {
  const [state, action] = useActionState(excludePlagiarismMatch, INITIAL)
  return (
    <form action={action} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="matchId" value={matchId} />
      <Field>
        <FieldLabel htmlFor={`reason-${matchId}`}>Exclusion reason</FieldLabel>
        <Textarea
          id={`reason-${matchId}`}
          name="reason"
          rows={2}
          className="min-h-16"
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`cert-${matchId}`}>Certificate PDF</FieldLabel>
        <Input
          id={`cert-${matchId}`}
          name="certificate"
          type="file"
          accept="application/pdf,.pdf"
          required
        />
      </Field>
      {state.message ? (
        state.ok ? (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        ) : (
          <FieldError className="flex items-center gap-1.5">
            <CircleAlertIcon className="size-3.5" />
            {state.message}
          </FieldError>
        )
      ) : null}
      <SubmitButton pendingLabel="Saving…">Certify exclusion</SubmitButton>
    </form>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
