import type { Job } from "bullmq"
import { deliverOtpEmail } from "@/lib/mail/otp"
import { deliverProvisionedEmail } from "@/lib/mail/provisioned"

export async function processNotify(job: Job): Promise<{ ok: true }> {
  if (job.name === "auth.otp") {
    const to = String(job.data?.to ?? "")
    const code = String(job.data?.code ?? "")
    if (!to || !code) {
      throw new Error("auth.otp job missing to/code")
    }
    await deliverOtpEmail(to, code)
    return { ok: true }
  }

  if (job.name === "user.provisioned") {
    const to = String(job.data?.to ?? "")
    const name = String(job.data?.name ?? "")
    const campusName = String(job.data?.campusName ?? "")
    const invitedBy = String(job.data?.invitedBy ?? "Your campus admin")
    const roles = Array.isArray(job.data?.roles)
      ? job.data.roles.map((role: unknown) => String(role))
      : []
    if (!to || !name) {
      throw new Error("user.provisioned job missing to/name")
    }
    await deliverProvisionedEmail({ to, name, campusName, roles, invitedBy })
    return { ok: true }
  }

  return { ok: true }
}
