import { AuditLog } from "@/lib/db/models/audit-log"
import { Campus } from "@/lib/db/models/campus"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import {
  defaultRolesForEmail,
  displayNameFromEmail,
  isAllowedSignInEmail,
  isDesignatedAdminEmail,
} from "@/lib/domain/email"

export async function findOrCreateAllowedUser(email: string) {
  await connectMongo()
  const existing = await User.findOne({ email })
  if (existing) {
    if (isDesignatedAdminEmail(email) && !existing.roles.includes("ADMIN")) {
      existing.roles = ["ADMIN", ...existing.roles.filter((role) => role !== "ADMIN")]
      await existing.save()
    }
    return existing
  }

  if (!isAllowedSignInEmail(email)) {
    return null
  }

  const campus = await Campus.findOne({ slug: "bhubaneswar", active: true })
  if (!campus) {
    throw new Error("Default campus is missing. Run npm run seed:m00 or seed:m01.")
  }

  const user = await User.create({
    name: displayNameFromEmail(email),
    email,
    campusId: campus._id,
    roles: defaultRolesForEmail(email),
    active: true,
  })
  await AuditLog.create({
    action: "user.auto_create",
    payload: { userId: String(user._id), email, roles: user.roles },
  })
  return user
}
