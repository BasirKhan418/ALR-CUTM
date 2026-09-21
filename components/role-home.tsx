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
  const tiles = [
    {
      label: "Campus",
      value: session.campusName,
      detail: "Bound to this campus",
      icon: Building2Icon,
    },
    {
      label: "Last sign-in",
      value: loginMethodLabel(session.loginMethod),
      detail: session.lastLoginAt
        ? formatDay(session.lastLoginAt)
        : "This session",
      icon: KeyRoundIcon,
    },
    {
      label: "Declaration",
      value: session.declarationAcceptedAt ? "Accepted" : "Pending",
      detail: session.declarationAcceptedAt
        ? formatDay(session.declarationAcceptedAt)
        : "Required before work",
      icon: ShieldCheckIcon,
    },
    {
      label: "Roles",
      value: `${session.roles.length} assigned`,
      detail: session.roles.map(roleLabel).join(" · "),
      icon: CheckCircle2Icon,
    },
  ]

  return (
    <PageEnter className="flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          {title} workspace
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {session.name}
        </h1>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          {purpose}
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

      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((tile, index) => (
          <div
            key={tile.label}
            className="group rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-sm"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {tile.label}
              </p>
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors duration-150 group-hover:bg-primary group-hover:text-primary-foreground">
                <tile.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-heading text-lg font-medium tracking-tight">
              {tile.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{tile.detail}</p>
          </div>
        ))}
      </div>
    </PageEnter>
  )
}
