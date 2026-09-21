import type { Job } from "bullmq"
import { deliverOtpEmail } from "@/lib/mail/otp"

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
  return { ok: true }
}
