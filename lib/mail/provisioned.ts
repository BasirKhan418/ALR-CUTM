import { getEnv, isSmtpConfigured } from "@/lib/config/env"
import { roleLabel } from "@/lib/ui/format"
import { factRow, mailLayout, pillRow } from "@/lib/mail/layout"
import { sendSmtp } from "@/lib/mail/smtp"

export type ProvisionedMail = {
  to: string
  name: string
  campusName: string
  roles: string[]
  invitedBy: string
}

export async function deliverProvisionedEmail(
  input: ProvisionedMail
): Promise<void> {
  const env = getEnv()
  const loginUrl = `${env.APP_URL.replace(/\/$/, "")}/login`
  const roles = input.roles.map(roleLabel)
  const subject = "You're on ALR — Centurion University"
  const text = [
    `Hi ${input.name},`,
    "",
    `${input.invitedBy} added you to the Academic Learning Record at ${input.campusName}.`,
    `Roles: ${roles.join(", ")}`,
    "",
    "There is no password. Sign in with this email using a one-time code, or Google if it is configured.",
    `Sign in: ${loginUrl}`,
    "",
    "The first visit asks for a one-time e-declaration.",
  ].join("\n")

  if (!isSmtpConfigured(env)) {
    console.log(`[mail] user.provisioned ${input.to}`)
    return
  }

  const html = mailLayout({
    preheader: `${input.invitedBy} added you to ALR at ${input.campusName}.`,
    eyebrow: "You're provisioned",
    title: `Welcome, ${input.name}`,
    intro: `${input.invitedBy} added this campus email to ALR. You can sign in now — no password is created.`,
    bodyHtml: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px">
        ${factRow("Email", input.to)}
        ${factRow("Campus", input.campusName)}
        ${pillRow(roles)}
      </table>
      <p style="margin:22px 0 0;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:#66716C">Use this email on the sign-in page. We send a one-time code, or you can continue with Google if your campus account is linked.</p>
    `,
    ctaLabel: "Sign in to ALR",
    ctaHref: loginUrl,
    footer:
      "Centurion University of Technology and Management. If you were not expecting this, ask your campus admin.",
  })

  await sendSmtp({ to: input.to, subject, text, html })
}
