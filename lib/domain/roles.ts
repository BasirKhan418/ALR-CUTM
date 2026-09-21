export const ROLES = [
  "STUDENT",
  "FACULTY",
  "MENTOR",
  "SUPERVISOR",
  "CO_SUPERVISOR",
  "INDUSTRY_SUPERVISOR",
  "HOD",
  "DEAN",
  "COMMITTEE_MEMBER",
  "ADMIN",
  "EXAM_CELL",
] as const

export type Role = (typeof ROLES)[number]

export const APP_SHELL_NAV = [
  {
    role: "STUDENT",
    href: "/student",
    label: "Student",
    purpose:
      "Authors records, signs declarations, and sees scores plus override reasons.",
  },
  {
    role: "FACULTY",
    href: "/faculty",
    label: "Faculty",
    purpose:
      "Course faculty. Subject-wise continuous evaluation. Signs CO attainment.",
  },
  {
    role: "MENTOR",
    href: "/mentor",
    label: "Mentor",
    purpose:
      "Distinct from Faculty. Signs the Annual PO/PSO attainment sheet.",
  },
  {
    role: "SUPERVISOR",
    href: "/supervisor",
    label: "Supervisor",
    purpose: "Guides major deliverables through the sequential e-sign chain.",
  },
  {
    role: "HOD",
    href: "/hod",
    label: "HoD",
    purpose:
      "Department sign-off, year-wise forwarding, and campus/department analytics.",
  },
  {
    role: "DEAN",
    href: "/dean",
    label: "Dean",
    purpose: "Constitutes committees and signs year-wise and program-wise evaluation.",
  },
  {
    role: "ADMIN",
    href: "/admin",
    label: "Admin",
    purpose: "Course and org setup, thresholds, and system health.",
  },
] as const

export type ShellRole = (typeof APP_SHELL_NAV)[number]["role"]

export function isShellRole(value: string | undefined): value is ShellRole {
  return APP_SHELL_NAV.some((item) => item.role === value)
}
