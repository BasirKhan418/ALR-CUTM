"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenIcon,
  Building2Icon,
  GraduationCapIcon,
  LandmarkIcon,
  LogOutIcon,
  SettingsIcon,
  UserCheckIcon,
  UserCogIcon,
} from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { SubmitButton } from "@/components/submit-button"
import { UserAvatar } from "@/components/user-avatar"
import { signOut } from "@/lib/actions/auth"
import { APP_SHELL_NAV, type ShellRole } from "@/lib/domain/roles"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
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

export function AppSidebar({
  roles,
  name,
  email,
  campusName,
  homeHref,
}: {
  roles: ShellRole[]
  name: string
  email: string
  campusName: string
  homeHref: string
}) {
  const pathname = usePathname()
  const items = APP_SHELL_NAV.filter((item) => roles.includes(item.role))

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="transition-colors duration-150"
              render={<Link href={homeHref} />}
            >
              <BrandMark showWordmark={false} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-heading font-semibold">
                  ALR
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {campusName}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {items.length > 1 ? "Your roles" : "Workspace"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const Icon = ROLE_ICONS[item.role]
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)
                return (
                  <SidebarMenuItem key={item.role}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      className="h-9 rounded-lg transition-[background-color,box-shadow] duration-150 data-active:shadow-[inset_2px_0_0_0_var(--sidebar-primary)]"
                      render={
                        <Link href={`${item.href}?role=${item.role}`} />
                      }
                    >
                      <span className="flex size-7 items-center justify-center rounded-md bg-foreground/6 text-sidebar-foreground transition-colors duration-150 group-data-active/menu-button:bg-sidebar-primary group-data-active/menu-button:text-sidebar-primary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="pb-3">
        <div className="flex items-center gap-2 rounded-lg bg-foreground/4 px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0">
          <UserAvatar name={name} />
          <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {email}
            </span>
          </div>
        </div>
        <form action={signOut} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <SubmitButton
            variant="ghost"
            size="sm"
            pendingLabel="Signing out…"
            className="h-8 w-full justify-start text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <LogOutIcon />
            <span className="group-data-[collapsible=icon]:hidden">
              Sign out
            </span>
          </SubmitButton>
        </form>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
