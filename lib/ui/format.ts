import { APP_SHELL_NAV, type Role } from "@/lib/domain/roles"

const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Student",
  FACULTY: "Faculty",
  MENTOR: "Mentor",
  SUPERVISOR: "Supervisor",
  CO_SUPERVISOR: "Co-supervisor",
  INDUSTRY_SUPERVISOR: "Industry supervisor",
  HOD: "HoD",
  DEAN: "Dean",
  COMMITTEE_MEMBER: "Committee",
  ADMIN: "Admin",
  EXAM_CELL: "Exam cell",
}

export function roleLabel(role: string): string {
  const shell = APP_SHELL_NAV.find((item) => item.role === role)
  if (shell) return shell.label
  return ROLE_LABELS[role as Role] ?? role
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

export function loginMethodLabel(method: string | null | undefined): string {
  if (method === "GOOGLE") return "Google"
  if (method === "OTP") return "Email OTP"
  return "—"
}

export function formatWhen(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function formatDay(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}
