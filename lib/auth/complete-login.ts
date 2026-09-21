import { AuditLog } from "@/lib/db/models/audit-log"
import type { LoginMethod } from "@/lib/db/models/user"
import type { Role } from "@/lib/domain/roles"
import { createSession } from "@/lib/auth/session"

export async function completeLogin(
  user: {
    _id: unknown
    roles: Role[]
    campusId: unknown
    declarationAcceptedAt?: Date
  },
  method: LoginMethod
): Promise<void> {
  await createSession({
    userId: String(user._id),
    roles: user.roles,
    campusId: String(user.campusId),
    declarationAcceptedAt: user.declarationAcceptedAt,
    loginMethod: method,
  })
  await AuditLog.create({
    actorId: user._id,
    action: "auth.login",
    payload: { method },
  })
}
