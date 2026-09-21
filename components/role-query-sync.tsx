"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { setActiveRole } from "@/lib/actions/auth"
import { isShellRole, type ShellRole } from "@/lib/domain/roles"

export function RoleQuerySync({ roles }: { roles: ShellRole[] }) {
  const searchParams = useSearchParams()
  const role = searchParams.get("role")
  const allowed = roles.join(",")

  useEffect(() => {
    if (role && isShellRole(role) && allowed.split(",").includes(role)) {
      void setActiveRole(role)
    }
  }, [role, allowed])

  return null
}
