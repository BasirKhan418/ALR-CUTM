"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenIcon,
  Building2Icon,
  GraduationCapIcon,
  LandmarkIcon,
  SettingsIcon,
  UserCheckIcon,
  UserCogIcon,
} from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
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

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <BrandMark showWordmark={false} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-heading font-semibold">ALR</span>
                <span className="truncate text-xs text-muted-foreground">
                  Centurion University
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Role shells</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {APP_SHELL_NAV.map((item) => {
                const Icon = ROLE_ICONS[item.role]
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <SidebarMenuItem key={item.role}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<a href={item.href} />}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          DEV preview. Auth arrives in M01.
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
