"use client"

import { Building2Icon, ChevronDownIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { SignOutMenu, SignOutMenuItem } from "@/components/sign-out-button"
import { UserAvatar } from "@/components/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { RoleSwitcher } from "@/components/role-switcher"
import { APP_SHELL_NAV, type ShellRole } from "@/lib/domain/roles"
import { shellRoleFromPath } from "@/lib/domain/workspace-nav"
import { cn } from "@/lib/utils"

export function SiteHeader({
  name,
  email,
  campusName,
  roles,
}: {
  name: string
  email: string
  campusName: string
  roles: ShellRole[]
}) {
  const pathname = usePathname()
  const role = shellRoleFromPath(pathname)
  const roleLabel =
    APP_SHELL_NAV.find((item) => item.role === role)?.label ?? "Learning Record"

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-foreground/[0.04] bg-background/90 px-4 backdrop-blur-sm sm:px-6">
      <SidebarTrigger className="-ml-1 shrink-0 md:hidden" />
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{campusName}</p>
          <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
            Learning Record · {roleLabel}
          </p>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <RoleSwitcher roles={roles} />
        <SignOutMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 transition-colors hover:bg-muted sm:pr-2.5">
              <UserAvatar name={name} size="sm" />
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-40 truncate text-sm font-bold">
                  {name}
                </span>
                <span className="block max-w-40 truncate text-[11px] text-muted-foreground">
                  {roleLabel}
                </span>
              </span>
              <ChevronDownIcon className="hidden size-4 text-muted-foreground sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {roleLabel} · {campusName}
                  </p>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <div className="p-1">
                <SignOutMenuItem
                  className={cn(
                    "rounded-md px-2 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  )}
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </SignOutMenu>
      </div>
    </header>
  )
}
