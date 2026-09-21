import type { AppSession } from "@/lib/auth/guards"
import { formatDay, loginMethodLabel, roleLabel } from "@/lib/ui/format"

export function SessionFacts({ session }: { session: AppSession }) {
  const declaration = session.declarationAcceptedAt
    ? `Declaration accepted ${formatDay(session.declarationAcceptedAt)}`
    : "Declaration pending"

  return (
    <p className="text-xs text-muted-foreground">
      {session.roles.map(roleLabel).join(" · ")}
      {" · "}
      {loginMethodLabel(session.loginMethod)}
      {session.lastLoginAt ? ` ${formatDay(session.lastLoginAt)}` : ""}
      {" · "}
      {declaration}
    </p>
  )
}
