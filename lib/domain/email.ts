import type { Role } from "@/lib/domain/roles"

export const CAMPUS_EMAIL_DOMAINS = ["cutm.ac.in", "cutm.edu.in"] as const
export const ADMIN_GMAIL = "khanbasir5555@gmail.com"
export const OTP_GMAIL = "khanbasir5556@gmail.com"

/** Seed dummy users. They skip OTP until invitation-based OTP ships. */
export const DEV_DIRECT_LOGIN_EMAILS = [
  "student.bbsr@cutm.ac.in",
  "student2.bbsr@cutm.ac.in",
  "faculty.bbsr@cutm.ac.in",
  "mentor.bbsr@cutm.ac.in",
  "supervisor.bbsr@cutm.ac.in",
  "hod.bbsr@cutm.ac.in",
  "dean.bbsr@cutm.ac.in",
  "admin.bbsr@cutm.ac.in",
  "faculty.multi@cutm.ac.in",
  "student.pkd@cutm.ac.in",
  ADMIN_GMAIL,
] as const

export const EMAIL_DOMAIN_MESSAGE =
  "Use a @cutm.ac.in or @cutm.edu.in email. Gmail is not accepted except the designated accounts."

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isCampusEmail(email: string): boolean {
  const domain = email.split("@")[1] ?? ""
  return (CAMPUS_EMAIL_DOMAINS as readonly string[]).includes(domain)
}

export function isDesignatedAdminEmail(email: string): boolean {
  return email === ADMIN_GMAIL
}

export function isDevDirectLoginEmail(email: string): boolean {
  return (DEV_DIRECT_LOGIN_EMAILS as readonly string[]).includes(email)
}

export function isOtpGmail(email: string): boolean {
  return email === OTP_GMAIL
}

export function isAllowedSignInEmail(email: string): boolean {
  return (
    isCampusEmail(email) ||
    isDesignatedAdminEmail(email) ||
    isOtpGmail(email)
  )
}

export function defaultRolesForEmail(email: string): Role[] {
  return isDesignatedAdminEmail(email) ? ["ADMIN"] : ["STUDENT"]
}

export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "User"
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
