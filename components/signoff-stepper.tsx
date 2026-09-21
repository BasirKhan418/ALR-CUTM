import { Badge } from "@/components/ui/badge"
import { decisionLabel, signoffRoleLabel } from "@/lib/domain/signoff"
import type { SignoffView } from "@/lib/deliverable/types"
import { formatWhen } from "@/lib/ui/format"

export function SignoffStepper({
  steps,
  empty,
}: {
  steps: SignoffView[]
  empty?: string
}) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {empty ?? "Sign-off starts after submit. It is a chain of steps, not a single submitted flag."}
      </p>
    )
  }

  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step) => (
        <li
          key={step.id}
          className="flex flex-col gap-1 rounded-lg px-3 py-2.5 ring-1 ring-foreground/10 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {step.stepOrder}. {signoffRoleLabel(step.role)}
            </p>
            <p className="text-xs text-muted-foreground">
              {step.actorName ?? "Waiting"}
              {step.at ? ` · ${formatWhen(step.at)}` : ""}
            </p>
            {step.reason ? (
              <p className="mt-1 text-sm">{step.reason}</p>
            ) : null}
          </div>
          <Badge
            variant={
              step.decision === "APPROVED"
                ? "default"
                : step.decision === "PENDING"
                  ? "outline"
                  : "secondary"
            }
          >
            {decisionLabel(step.decision)}
          </Badge>
        </li>
      ))}
    </ol>
  )
}
