import type { ShellRole } from "@/lib/domain/roles"
import { APP_SHELL_NAV } from "@/lib/domain/roles"

export type WorkspaceIcon =
  | "courses"
  | "inbox"
  | "plus"
  | "people"
  | "settings"
  | "home"
  | "mentor"

export type WorkspaceLink = {
  href: string
  label: string
  icon: WorkspaceIcon
  isActive: (pathname: string) => boolean
}

function exact(href: string) {
  return (pathname: string) => pathname === href
}

function prefix(href: string) {
  return (pathname: string) =>
    pathname === href || pathname.startsWith(`${href}/`)
}

function facultyCourses(pathname: string) {
  if (pathname === "/faculty") return true
  if (pathname === "/faculty/courses/new") return false
  if (pathname.startsWith("/faculty/deliverables")) return true
  return /^\/faculty\/courses\/[^/]+$/.test(pathname)
}

function adminCourses(pathname: string) {
  if (pathname === "/admin/courses") return true
  if (pathname === "/admin/courses/new") return false
  return /^\/admin\/courses\/[^/]+$/.test(pathname)
}

export const WORKSPACE_NAV: Record<ShellRole, WorkspaceLink[]> = {
  STUDENT: [
    {
      href: "/student",
      label: "My courses",
      icon: "courses",
      isActive: prefix("/student"),
    },
  ],
  FACULTY: [
    {
      href: "/faculty",
      label: "Courses",
      icon: "courses",
      isActive: facultyCourses,
    },
    {
      href: "/faculty/inbox",
      label: "Inbox",
      icon: "inbox",
      isActive: prefix("/faculty/inbox"),
    },
    {
      href: "/faculty/courses/new",
      label: "New course",
      icon: "plus",
      isActive: exact("/faculty/courses/new"),
    },
    {
      href: "/supervisor",
      label: "Sign-off",
      icon: "inbox",
      isActive: prefix("/supervisor"),
    },
  ],
  MENTOR: [
    {
      href: "/mentor",
      label: "PO / PSO courses",
      icon: "mentor",
      isActive: prefix("/mentor"),
    },
  ],
  SUPERVISOR: [
    {
      href: "/supervisor",
      label: "Sign-off queue",
      icon: "inbox",
      isActive: prefix("/supervisor"),
    },
  ],
  HOD: [
    {
      href: "/hod",
      label: "Sign-off queue",
      icon: "inbox",
      isActive: prefix("/hod"),
    },
  ],
  DEAN: [
    {
      href: "/dean",
      label: "Sign-off queue",
      icon: "inbox",
      isActive: prefix("/dean"),
    },
  ],
  ADMIN: [
    {
      href: "/admin",
      label: "People",
      icon: "people",
      isActive: exact("/admin"),
    },
    {
      href: "/admin/courses",
      label: "Courses",
      icon: "courses",
      isActive: adminCourses,
    },
    {
      href: "/admin/courses/new",
      label: "New course",
      icon: "plus",
      isActive: exact("/admin/courses/new"),
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: "settings",
      isActive: prefix("/admin/settings"),
    },
  ],
}

export function shellRoleFromPath(pathname: string): ShellRole | undefined {
  const ranked = [...APP_SHELL_NAV].sort((a, b) => b.href.length - a.href.length)
  return ranked.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )?.role
}

export function workspaceLinksFor(
  pathname: string,
  roles: readonly ShellRole[]
): WorkspaceLink[] {
  const role = shellRoleFromPath(pathname)
  if (role && roles.includes(role)) return WORKSPACE_NAV[role]
  const first = roles[0]
  return first ? WORKSPACE_NAV[first] : []
}

export function pageTitleFor(pathname: string): string {
  const role = shellRoleFromPath(pathname)
  if (role) {
    const match = WORKSPACE_NAV[role].find((item) => item.isActive(pathname))
    if (match) return match.label
    return APP_SHELL_NAV.find((item) => item.role === role)?.label ?? "Learning Record"
  }
  return "Learning Record"
}
