"use server"

import { revalidatePath } from "next/cache"
import { AuditLog } from "@/lib/db/models/audit-log"
import { Campus } from "@/lib/db/models/campus"
import { Declaration } from "@/lib/db/models/declaration"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { normalizeEmail } from "@/lib/auth/otp"
import {
  EMAIL_DOMAIN_MESSAGE,
  isAllowedSignInEmail,
  isDesignatedAdminEmail,
} from "@/lib/domain/email"
import { isProvisionableRole, type Role } from "@/lib/domain/roles"
import { notifyQueue } from "@/lib/queue/queues"

export type CreateUserState = {
  ok: boolean
  message?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function createUser(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return { ok: false, message: "Only Admin can provision users." }
  }

  const name = String(formData.get("name") ?? "").trim()
  const email = normalizeEmail(String(formData.get("email") ?? ""))
  const campusId = String(formData.get("campusId") ?? "").trim()
  const registrationNo = String(formData.get("registrationNo") ?? "").trim()
  const roles = formData
    .getAll("roles")
    .map((value) => String(value))
    .filter(isProvisionableRole)

  if (!name) return { ok: false, message: "Name is required." }
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email." }
  if (!isAllowedSignInEmail(email)) {
    return { ok: false, message: EMAIL_DOMAIN_MESSAGE }
  }
  if (!campusId) return { ok: false, message: "Campus is required." }
  if (roles.length === 0) {
    return { ok: false, message: "Select at least one role." }
  }
  if (isDesignatedAdminEmail(email) && !roles.includes("ADMIN")) {
    roles.unshift("ADMIN")
  }

  await connectMongo()
  const campus = await Campus.findById(campusId)
  if (!campus) return { ok: false, message: "Campus was not found." }

  const existing = await User.findOne({ email })
  if (existing) {
    return { ok: false, message: "That email is already provisioned." }
  }

  if (registrationNo) {
    const takenReg = await User.findOne({ registrationNo })
    if (takenReg) {
      return { ok: false, message: "That registration number is already used." }
    }
  }

  const user = await User.create({
    name,
    email,
    campusId: campus._id,
    roles: roles as Role[],
    active: true,
    ...(registrationNo ? { registrationNo } : {}),
  })

  await AuditLog.create({
    actorId: session.userId,
    action: "user.create",
    payload: { userId: String(user._id), email, roles },
  })
  try {
    await notifyQueue().add("user.provisioned", {
      to: email,
      name,
      campusName: campus.name,
      roles,
      invitedBy: session.name,
    })
  } catch (error) {
    console.error("[user.create] invite mail", error)
  }
  revalidatePath("/admin")
  return {
    ok: true,
    message: `${name} was added. We sent a sign-in email to ${email}.`,
  }
}

export type UserMutationState = {
  ok: boolean
  message?: string
}

async function requireAdmin() {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return { session: null as null, error: "Only Admin can manage users." }
  }
  return { session, error: null }
}

async function remainingActiveAdmins(exceptUserId: string): Promise<number> {
  return User.countDocuments({
    _id: { $ne: exceptUserId },
    roles: "ADMIN",
    active: true,
  })
}

export async function setUserActive(
  userId: string,
  active: boolean
): Promise<UserMutationState> {
  const { session, error } = await requireAdmin()
  if (!session) return { ok: false, message: error }

  if (!userId) return { ok: false, message: "User is required." }
  if (userId === session.userId && !active) {
    return { ok: false, message: "You cannot deactivate your own account." }
  }

  await connectMongo()
  const user = await User.findById(userId)
  if (!user) return { ok: false, message: "That person was not found." }

  if (!active && user.roles.includes("ADMIN")) {
    const others = await remainingActiveAdmins(String(user._id))
    if (others === 0) {
      return { ok: false, message: "Keep at least one active admin." }
    }
  }

  user.active = active
  await user.save()
  await AuditLog.create({
    actorId: session.userId,
    action: active ? "user.activate" : "user.deactivate",
    payload: { userId, email: user.email },
  })
  revalidatePath("/admin")
  return {
    ok: true,
    message: active
      ? `${user.name} can sign in again.`
      : `${user.name} can no longer sign in.`,
  }
}

export async function deleteUser(userId: string): Promise<UserMutationState> {
  const { session, error } = await requireAdmin()
  if (!session) return { ok: false, message: error }

  if (!userId) return { ok: false, message: "User is required." }
  if (userId === session.userId) {
    return { ok: false, message: "You cannot delete your own account." }
  }

  await connectMongo()
  const user = await User.findById(userId)
  if (!user) return { ok: false, message: "That person was not found." }

  if (user.roles.includes("ADMIN")) {
    const others = await remainingActiveAdmins(String(user._id))
    if (others === 0) {
      return { ok: false, message: "Keep at least one admin." }
    }
  }

  const email = user.email
  const name = user.name
  await User.deleteOne({ _id: user._id })
  await Declaration.deleteMany({ userId: user._id })
  await AuditLog.create({
    actorId: session.userId,
    action: "user.delete",
    payload: { userId, email },
  })
  revalidatePath("/admin")
  return { ok: true, message: `${name} was removed.` }
}
