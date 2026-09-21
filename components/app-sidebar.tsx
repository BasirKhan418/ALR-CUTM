"use client"

import type { ComponentType, ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenIcon,
  Building2Icon,
  GraduationCapIcon,
  HomeIcon,
  InboxIcon,
  LandmarkIcon,
  PlusIcon,
  SettingsIcon,
  ShieldIcon,
  UserCheckIcon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { setActiveRole } from "@/lib/actions/auth"
import { SignOutButton } from "@/components/sign-out-button"
import { APP_SHELL_NAV, type ShellRole } from "@/lib/domain/roles"
import {
  shellRoleFromPath,
  workspaceLinksFor,
  type WorkspaceIcon,
} from "@/lib/domain/workspace-nav"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"

const ROLE_ICONS: Record<ShellRole, ComponentType<{ className?: string }>> = {
  STUDENT: GraduationCapIcon,
  FACULTY: BookOpenIcon,
  MENTOR: UserCheckIcon,
  SUPERVISOR: UserCogIcon,
  HOD: Building2Icon,
  DEAN: LandmarkIcon,
  ADMIN: SettingsIcon,
}

const LINK_ICONS: Record<WorkspaceIcon, ComponentType<{ className?: string }>> = {
  courses: BookOpenIcon,
  inbox: InboxIcon,
  plus: PlusIcon,
  people: UsersIcon,
  settings: SettingsIcon,
  home: HomeIcon,
  mentor: UserCheckIcon,
  shield: ShieldIcon,
}

export function AppSidebar({
  roles,
  campusName,
  homeHref,
}: {
  roles: ShellRole[]
  campusName: string
  homeHref: string
}) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const roleItems = APP_SHELL_NAV.filter((item) => roles.includes(item.role))
  const currentRole = shellRoleFromPath(pathname)
  const links = workspaceLinksFor(pathname, roles)

  function closeMobile() {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar
      variant="sidebar"
      collapsible="offcanvas"
      className="border-r border-sidebar-border/80 bg-sidebar"
    >
      <SidebarHeader className="gap-0 px-4 pt-5 pb-1">
        <Link
          href={homeHref}
          onClick={closeMobile}
          className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent/80"
        >
          <BrandMark showWordmark={false} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight">ALR</p>
            <p className="truncate text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {campusName}
            </p>
          </div>
        </Link>
        <div className="relative mx-2 mt-4 mb-1">
          <div className="h-px bg-gradient-to-r from-transparent via-sidebar-primary/35 to-transparent" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 pt-2">
        {roleItems.length > 1 ? (
          <NavBlock label="Your roles">
            {roleItems.map((item) => {
              const Icon = ROLE_ICONS[item.role]
              return (
                <NavLink
                  key={item.role}
                  href={`${item.href}?role=${item.role}`}
                  label={item.label}
                  icon={Icon}
                  active={currentRole === item.role}
                  onClick={() => {
                    void setActiveRole(item.role)
                    closeMobile()
                  }}
                />
              )
            })}
          </NavBlock>
        ) : null}
        <NavBlock label="Workspace">
          {links.map((item) => {
            const Icon = LINK_ICONS[item.icon]
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={Icon}
                active={item.isActive(pathname)}
                onClick={closeMobile}
              />
            )
          })}
        </NavBlock>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 px-3 py-3">
        <SignOutButton className="h-10 justify-start gap-2.5 rounded-xl px-3 text-destructive hover:bg-destructive/10 hover:text-destructive" />
      </SidebarFooter>
    </Sidebar>
  )
}

function NavBlock({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  active: boolean
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-primary/15 font-semibold text-sidebar-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="min-w-0 leading-snug">{label}</span>
    </Link>
  )
}
