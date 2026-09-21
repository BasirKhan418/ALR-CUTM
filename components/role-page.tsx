import { Forbidden } from "@/components/forbidden"
import { RoleHome } from "@/components/role-home"
import { requireSession } from "@/lib/auth/guards"
import { APP_SHELL_NAV, firstShellHref, type ShellRole } from "@/lib/domain/roles"

export async function RolePage({ role }: { role: ShellRole }) {
  const session = await requireSession()
  const item = APP_SHELL_NAV.find((nav) => nav.role === role)
  if (!item) {
    throw new Error(`Unknown shell role: ${role}`)
  }
  if (!session.roles.includes(role)) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  return (
    <RoleHome
      role={role}
      title={item.label}
      purpose={item.purpose}
      session={session}
    />
  )
}
