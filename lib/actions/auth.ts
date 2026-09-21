"use server"

import { redirect } from "next/navigation"
import { AuditLog } from "@/lib/db/models/audit-log"
import { Declaration } from "@/lib/db/models/declaration"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import { notifyQueue } from "@/lib/queue/queues"
import { isLocalhostApp } from "@/lib/config/env"
import { OTP_GENERIC_SENT, LOCK_SECONDS } from "@/lib/auth/constants"
import { getSession, requireSession } from "@/lib/auth/guards"
import { findOrCreateAllowedUser } from "@/lib/auth/provision"
import {
  EMAIL_DOMAIN_MESSAGE,
  isAllowedSignInEmail,
  isDevDirectLoginEmail,
  normalizeEmail,
} from "@/lib/domain/email"
import { firstShellHref } from "@/lib/domain/roles"
import {
  generateOtp,
  isOtpLocked,
  rateLimit,
  storeOtp,
  verifyStoredOtp,
} from "@/lib/auth/otp"
import { requestIp, requestUserAgent } from "@/lib/auth/request-meta"
import { completeLogin } from "@/lib/auth/complete-login"
import { destroySession, updateSessionDeclaration } from "@/lib/auth/session"
import { DECLARATION_VERSION } from "@/lib/domain/declaration"

export type AuthFormState = {
  ok: boolean
  message?: string
  email?: string
  step?: "email" | "otp"
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function requestOtp(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""))
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Enter a valid email.", step: "email" }
  }
  if (!isAllowedSignInEmail(email)) {
    return { ok: false, message: EMAIL_DOMAIN_MESSAGE, email, step: "email" }
  }

  if (isDevDirectLoginEmail(email)) {
    const user = await findOrCreateAllowedUser(email)
    if (!user || !user.active) {
      return { ok: false, message: EMAIL_DOMAIN_MESSAGE, email, step: "email" }
    }
    user.lastLoginAt = new Date()
    user.lastLoginMethod = "OTP"
    await user.save()
    await completeLogin(user, "OTP")
    redirect(firstShellHref(user.roles))
  }

  const ip = await requestIp()
  const emailOk = await rateLimit(`rl:otp:${email}`, 3, LOCK_SECONDS)
  const ipOk = await rateLimit(`rl:auth:${ip}`, 20, LOCK_SECONDS)
  if (!emailOk || !ipOk) {
    return {
      ok: false,
      message: "Please wait before requesting another code.",
      email,
      step: "email",
    }
  }

  const user = await findOrCreateAllowedUser(email)
  if (!user || !user.active) {
    return { ok: false, message: EMAIL_DOMAIN_MESSAGE, email, step: "email" }
  }

  if (await isOtpLocked(email)) {
    return {
      ok: false,
      message: "Too many attempts. Try again in 15 minutes.",
      email,
      step: "otp",
    }
  }

  const code = generateOtp()
  await storeOtp(email, code)
  try {
    await notifyQueue().add("auth.otp", { to: email, code })
  } catch {
    // Worker may be down; localhost still prints the code below.
  }
  if (isLocalhostApp()) {
    console.log(`[otp] ${email} ${code}`)
  }

  return { ok: true, message: OTP_GENERIC_SENT, email, step: "otp" }
}

export async function verifyOtp(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""))
  const code = String(formData.get("code") ?? "")
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Enter a valid email.", step: "email" }
  }
  if (!isAllowedSignInEmail(email)) {
    return { ok: false, message: EMAIL_DOMAIN_MESSAGE, email, step: "email" }
  }

  const ip = await requestIp()
  const ipOk = await rateLimit(`rl:auth:${ip}`, 20, LOCK_SECONDS)
  if (!ipOk) {
    return {
      ok: false,
      message: "Please wait before trying again.",
      email,
      step: "otp",
    }
  }

  const result = await verifyStoredOtp(email, code)
  if (result === "locked") {
    return {
      ok: false,
      message: "Too many attempts. Try again in 15 minutes.",
      email,
      step: "otp",
    }
  }
  if (result !== "ok") {
    return {
      ok: false,
      message: "Invalid or expired code.",
      email,
      step: "otp",
    }
  }

  const user = await findOrCreateAllowedUser(email)
  if (!user || !user.active) {
    return {
      ok: false,
      message: "Invalid or expired code.",
      email,
      step: "otp",
    }
  }

  user.lastLoginAt = new Date()
  user.lastLoginMethod = "OTP"
  await user.save()
  await completeLogin(user, "OTP")
  redirect(firstShellHref(user.roles))
}

export async function signOut(): Promise<void> {
  const session = await getSession()
  await destroySession()
  if (session) {
    await connectMongo()
    await AuditLog.create({
      actorId: session.userId,
      action: "auth.logout",
    })
  }
  redirect("/login")
}

export type DeclarationState = {
  ok: boolean
  message?: string
}

export async function acceptDeclaration(
  _prev: DeclarationState,
  formData: FormData
): Promise<DeclarationState> {
  const session = await requireSession()
  const accepted = formData.get("accepted")
  if (accepted !== "on" && accepted !== "true") {
    return { ok: false, message: "You must accept the declaration to continue." }
  }

  if (session.declarationAcceptedAt) {
    redirect(firstShellHref(session.roles))
  }

  const acceptedAt = new Date()
  await connectMongo()
  await Declaration.create({
    userId: session.userId,
    acceptedAt,
    ip: await requestIp(),
    userAgent: await requestUserAgent(),
    textVersion: DECLARATION_VERSION,
  })
  await User.updateOne(
    { _id: session.userId },
    { $set: { declarationAcceptedAt: acceptedAt } }
  )
  await updateSessionDeclaration(acceptedAt)
  await AuditLog.create({
    actorId: session.userId,
    action: "declaration.accept",
    payload: { textVersion: DECLARATION_VERSION },
  })
  redirect(firstShellHref(session.roles))
}
