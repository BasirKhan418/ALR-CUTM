import { connection } from "next/server"
import { RoleHome } from "@/components/role-home"
import { APP_SHELL_NAV, type ShellRole } from "@/lib/domain/roles"

export async function RolePage({ role }: { role: ShellRole }) {
  await connection()
  const item = APP_SHELL_NAV.find((nav) => nav.role === role)
  if (!item) {
    throw new Error(`Unknown shell role: ${role}`)
  }
  return <RoleHome title={item.label} purpose={item.purpose} />
}
