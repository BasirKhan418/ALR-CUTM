"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { setActiveRole } from "@/lib/actions/auth"
import { APP_SHELL_NAV, type ShellRole } from "@/lib/domain/roles"
import { cn } from "@/lib/utils"

export function RoleSwitcher({ roles }: { roles: ShellRole[] }) {
  const pathname = usePathname()
  const items = APP_SHELL_NAV.filter((item) => roles.includes(item.role))
  if (items.length < 2) return null

  return (
    <nav className="hidden items-center gap-0.5 rounded-lg bg-muted p-[3px] md:flex">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.role}
            href={`${item.href}?role=${item.role}`}
            onClick={() => {
              void setActiveRole(item.role)
            }}
            className={cn(
              "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
