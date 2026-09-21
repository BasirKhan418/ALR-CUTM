"use server"

import { revalidatePath } from "next/cache"
import { AuditLog } from "@/lib/db/models/audit-log"
import { Campus } from "@/lib/db/models/campus"
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
  revalidatePath("/admin")
  return {
    ok: true,
    message:
      "They will sign in with email OTP or Google using this email.",
  }
}
