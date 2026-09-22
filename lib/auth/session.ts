import { cookies } from "next/headers"
import { getEnv } from "@/lib/config/env"
import { readyValkey } from "@/lib/valkey"
import type { LoginMethod } from "@/lib/db/models/user"
import type { Role } from "@/lib/domain/roles"
import { firstShellHref } from "@/lib/domain/roles"
import {
  DAY_SECONDS,
  HOME_COOKIE,
  ROLE_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth/constants"
import { parseSessionCookie, randomId, signSessionId } from "@/lib/auth/crypto"

export type SessionRecord = {
  userId: string
  roles: Role[]
  campusId: string
  declarationAcceptedAt: string | null
  loginMethod: LoginMethod
  createdAt: number
}

function sessionTtlSeconds(): number {
  return getEnv().SESSION_TTL_DAYS * DAY_SECONDS
}

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production" && !getEnv().APP_URL.includes("localhost")
}

function sessionKey(sid: string): string {
  return `sess:${sid}`
}

export async function readSessionRecord(): Promise<{
  sid: string
  record: SessionRecord
} | null> {
  const jar = await cookies()
  const sid = parseSessionCookie(jar.get(SESSION_COOKIE)?.value)
  if (!sid) return null
  const raw = await (await readyValkey()).get(sessionKey(sid))
  if (!raw) return null
  try {
    const record = JSON.parse(raw) as SessionRecord
    if (!record.userId || !Array.isArray(record.roles)) return null
    return { sid, record }
  } catch {
    return null
  }
}

export async function writeSessionRecord(
  sid: string,
  record: SessionRecord
): Promise<void> {
  await (await readyValkey()).set(
    sessionKey(sid),
    JSON.stringify(record),
    "EX",
    sessionTtlSeconds()
  )
}

export async function createSession(input: {
  userId: string
  roles: Role[]
  campusId: string
  declarationAcceptedAt: Date | string | null | undefined
  loginMethod: LoginMethod
}): Promise<string> {
  const sid = randomId()
  const record: SessionRecord = {
    userId: input.userId,
    roles: input.roles,
    campusId: input.campusId,
    declarationAcceptedAt: input.declarationAcceptedAt
      ? new Date(input.declarationAcceptedAt).toISOString()
      : null,
    loginMethod: input.loginMethod,
    createdAt: Date.now(),
  }
  await writeSessionRecord(sid, record)
  await attachSessionCookies(sid, firstShellHref(input.roles), input.roles[0])
  return sid
}

export async function refreshSessionIfNeeded(
  sid: string,
  record: SessionRecord
): Promise<SessionRecord> {
  if (Date.now() - record.createdAt < DAY_SECONDS * 1000) {
    return record
  }
  const next = { ...record, createdAt: Date.now() }
  await writeSessionRecord(sid, next)
  try {
    const jar = await cookies()
    const home = jar.get(HOME_COOKIE)?.value || firstShellHref(record.roles)
    const role = jar.get(ROLE_COOKIE)?.value
    await attachSessionCookies(sid, home, role)
  } catch {
    // Next.js only allows cookie writes in a Server Action or Route Handler.
    // getSession runs during render, so the sliding cookie maxAge is skipped
    // there. The Valkey record and TTL were already extended above.
  }
  return next
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  const sid = parseSessionCookie(jar.get(SESSION_COOKIE)?.value)
  if (sid) {
    await (await readyValkey()).del(sessionKey(sid))
  }
  jar.delete(SESSION_COOKIE)
  jar.delete(HOME_COOKIE)
  jar.delete(ROLE_COOKIE)
}

export async function attachSessionCookies(
  sid: string,
  homeHref: string,
  role?: string
): Promise<void> {
  const jar = await cookies()
  const maxAge = sessionTtlSeconds()
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge,
  }
  jar.set(SESSION_COOKIE, signSessionId(sid), base)
  jar.set(HOME_COOKIE, homeHref, base)
  if (role) {
    jar.set(ROLE_COOKIE, role, { ...base, httpOnly: false })
  }
}

export async function updateSessionDeclaration(
  acceptedAt: Date
): Promise<void> {
  const current = await readSessionRecord()
  if (!current) return
  const next = {
    ...current.record,
    declarationAcceptedAt: acceptedAt.toISOString(),
  }
  await writeSessionRecord(current.sid, next)
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge: sessionTtlSeconds(),
  }
}
