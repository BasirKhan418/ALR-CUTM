import { connection } from "next/server"
import { redirect } from "next/navigation"
import { connectMongo } from "@/lib/db/mongo"
import { Campus } from "@/lib/db/models/campus"
import { User } from "@/lib/db/models/user"
import type { Role } from "@/lib/domain/roles"
import {
  destroySession,
  readSessionRecord,
  refreshSessionIfNeeded,
  type SessionRecord,
} from "@/lib/auth/session"

export type AppSession = SessionRecord & {
  name: string
  email: string
  campusName: string
  campusSlug: string
  lastLoginAt: string | null
}

export async function getSession(): Promise<AppSession | null> {
  await connection()
  const current = await readSessionRecord()
  if (!current) return null
  const record = await refreshSessionIfNeeded(current.sid, current.record)
  await connectMongo()
  const user = await User.findById(record.userId)
  if (!user || !user.active) {
    await destroySession()
    return null
  }
  const campus = await Campus.findById(user.campusId)
  return {
    ...record,
    userId: String(user._id),
    roles: user.roles,
    campusId: String(user.campusId),
    declarationAcceptedAt: user.declarationAcceptedAt
      ? user.declarationAcceptedAt.toISOString()
      : null,
    name: user.name,
    email: user.email,
    campusName: campus?.name ?? "Unknown campus",
    campusSlug: campus?.slug ?? "",
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    loginMethod: user.lastLoginMethod ?? record.loginMethod,
  }
}

export async function requireSession(): Promise<AppSession> {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  return session
}

export function hasRole(session: AppSession, ...roles: Role[]): boolean {
  return roles.some((role) => session.roles.includes(role))
}

export async function requireRole(...roles: Role[]): Promise<AppSession> {
  const session = await requireSession()
  if (!hasRole(session, ...roles)) {
    redirect("/student")
  }
  return session
}
