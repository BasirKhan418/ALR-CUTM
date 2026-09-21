import {
  Building2Icon,
  CheckCircle2Icon,
  KeyRoundIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { PageEnter } from "@/components/page-enter"
import { Badge } from "@/components/ui/badge"
import type { AppSession } from "@/lib/auth/guards"
import type { ShellRole } from "@/lib/domain/roles"
import {
  formatDay,
  loginMethodLabel,
  roleLabel,
} from "@/lib/ui/format"

export function RoleHome({
  role,
  title,
  purpose,
  session,
}: {
  role: ShellRole
  title: string
  purpose: string
  session: AppSession
}) {
  const facts = [
    {
      label: "Campus",
      value: session.campusName,
      icon: Building2Icon,
    },
    {
      label: "Last sign-in",
      value: session.lastLoginAt
        ? `${loginMethodLabel(session.loginMethod)} · ${formatDay(session.lastLoginAt)}`
        : loginMethodLabel(session.loginMethod),
      icon: KeyRoundIcon,
    },
    {
      label: "Declaration",
      value: session.declarationAcceptedAt
        ? `Accepted · ${formatDay(session.declarationAcceptedAt)}`
        : "Pending",
      icon: ShieldCheckIcon,
    },
    {
      label: "Roles",
      value: session.roles.map(roleLabel).join(" · "),
      icon: CheckCircle2Icon,
    },
  ]

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Welcome, {session.name}. {purpose}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {session.roles.map((item) => (
            <Badge
              key={item}
              variant={item === role ? "default" : "outline"}
            >
              {roleLabel(item)}
            </Badge>
          ))}
        </div>
      </div>

      <dl className="grid gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 sm:grid-cols-2">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="flex items-start gap-3 bg-card p-4"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <fact.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <dt className="eyebrow">{fact.label}</dt>
              <dd className="mt-1 text-sm font-medium">{fact.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </PageEnter>
  )
}
