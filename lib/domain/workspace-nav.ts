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
  | "shield"
  | "scale"

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

function deanQueue(pathname: string) {
  if (pathname === "/dean") return true
  if (
    pathname.startsWith("/dean/cases") ||
    pathname.startsWith("/dean/years") ||
    pathname.startsWith("/dean/program") ||
    pathname.startsWith("/dean/records") ||
    pathname.startsWith("/dean/analytics")
  ) {
    return false
  }
  return /^\/dean\/[^/]+$/.test(pathname)
}

function hodQueue(pathname: string) {
  if (pathname === "/hod") return true
  if (pathname.startsWith("/hod/years") || pathname.startsWith("/hod/analytics")) {
    return false
  }
  return pathname.startsWith("/hod/")
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
      isActive: (pathname) =>
        pathname === "/student" || pathname.startsWith("/student/courses"),
    },
    {
      href: "/student/cases",
      label: "Cases",
      icon: "shield",
      isActive: prefix("/student/cases"),
    },
    {
      href: "/student/credits",
      label: "Credits",
      icon: "scale",
      isActive: prefix("/student/credits"),
    },
    {
      href: "/student/exports",
      label: "Exports",
      icon: "home",
      isActive: prefix("/student/exports"),
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
    {
      href: "/faculty/cases",
      label: "Cases",
      icon: "shield",
      isActive: prefix("/faculty/cases"),
    },
    {
      href: "/faculty/attainment",
      label: "CO attainment",
      icon: "scale",
      isActive: prefix("/faculty/attainment"),
    },
    {
      href: "/faculty/exports",
      label: "Exports",
      icon: "home",
      isActive: prefix("/faculty/exports"),
    },
  ],
  MENTOR: [
    {
      href: "/mentor",
      label: "PO / PSO courses",
      icon: "mentor",
      isActive: (pathname) =>
        pathname === "/mentor" || pathname.startsWith("/mentor/courses"),
    },
    {
      href: "/mentor/attainment",
      label: "PO/PSO attainment",
      icon: "scale",
      isActive: prefix("/mentor/attainment"),
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
      isActive: hodQueue,
    },
    {
      href: "/hod/years",
      label: "Year status",
      icon: "scale",
      isActive: prefix("/hod/years"),
    },
    {
      href: "/hod/analytics",
      label: "Analytics",
      icon: "home",
      isActive: prefix("/hod/analytics"),
    },
  ],
  DEAN: [
    {
      href: "/dean",
      label: "Sign-off queue",
      icon: "inbox",
      isActive: deanQueue,
    },
    {
      href: "/dean/years",
      label: "Year evaluation",
      icon: "scale",
      isActive: prefix("/dean/years"),
    },
    {
      href: "/dean/program",
      label: "Programme evaluation",
      icon: "courses",
      isActive: prefix("/dean/program"),
    },
    {
      href: "/dean/cases",
      label: "Cases",
      icon: "shield",
      isActive: prefix("/dean/cases"),
    },
    {
      href: "/dean/analytics",
      label: "Analytics",
      icon: "home",
      isActive: prefix("/dean/analytics"),
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
    {
      href: "/admin/cases",
      label: "Cases",
      icon: "shield",
      isActive: prefix("/admin/cases"),
    },
    {
      href: "/admin/audit",
      label: "Audit",
      icon: "shield",
      isActive: exact("/admin/audit"),
    },
    {
      href: "/admin/health",
      label: "Health",
      icon: "home",
      isActive: exact("/admin/health"),
    },
    {
      href: "/admin/exports",
      label: "Exam cell",
      icon: "scale",
      isActive: exact("/admin/exports"),
    },
    {
      href: "/admin/analytics",
      label: "Analytics",
      icon: "home",
      isActive: prefix("/admin/analytics"),
    },
  ],
  COMMITTEE_MEMBER: [
    {
      href: "/committee",
      label: "Assignments",
      icon: "scale",
      isActive: prefix("/committee"),
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
