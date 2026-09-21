import { Badge } from "@/components/ui/badge"
import { recordTypeLabel } from "@/lib/domain/record-types"
import { formatMarks } from "@/lib/scoring/format"
import type { SubjectScoreView } from "@/lib/scoring/types"

export function SubjectScoreCard({
  score,
  compact = false,
}: {
  score: SubjectScoreView
  compact?: boolean
}) {
  const pending = !score.computedAt
  return (
    <article
      className={
        compact
          ? "rounded-xl bg-card p-3 ring-1 ring-foreground/10"
          : "rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="eyebrow">{recordTypeLabel(score.recordType)}</p>
          <p className="mt-1 font-heading text-2xl font-semibold">
            {pending ? "—" : `${formatMarks(score.normalized)} / ${score.frameworkMarks}`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Subject contribution · {score.weightPercent}%
          </p>
        </div>
        <Badge variant={pending ? "outline" : "secondary"}>
          {pending ? "Not scored" : "Normalized"}
        </Badge>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="eyebrow">Raw average</dt>
          <dd className="mt-1">
            {pending
              ? "—"
              : `${formatMarks(score.rawAverage)} / ${score.entryMax}`}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Framework marks</dt>
          <dd className="mt-1">{score.frameworkMarks}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="eyebrow">Formula</dt>
          <dd className="mt-1 text-muted-foreground">{score.formulaText}</dd>
        </div>
      </dl>
      {score.overrideReason ? (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
          Faculty override: {score.overrideReason}
        </p>
      ) : null}
    </article>
  )
}
