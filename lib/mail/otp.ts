import { getEnv, isSmtpConfigured } from "@/lib/config/env"
import { mailLayout } from "@/lib/mail/layout"
import { sendSmtp } from "@/lib/mail/smtp"

export async function deliverOtpEmail(to: string, code: string): Promise<void> {
  const env = getEnv()
  const minutes = Math.max(1, Math.round(env.OTP_TTL_SECONDS / 60))
  const subject = "Your ALR sign-in code"
  const text = `Your ALR sign-in code is ${code}. It expires in ${minutes} minutes.`

  if (!isSmtpConfigured(env)) {
    console.log(`[otp] ${to} ${code}`)
    return
  }

  const html = mailLayout({
    preheader: `Your ALR sign-in code is ${code}.`,
    eyebrow: "Sign-in code",
    title: "Use this code to continue",
    intro: `It expires in ${minutes} minutes. If you did not request it, you can ignore this email.`,
    bodyHtml: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
        <tr>
          <td align="center" style="background:#F3EEE0;border:1px solid #E6E0D2;border-radius:14px;padding:22px 16px">
            <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;letter-spacing:0.28em;font-weight:600;color:#1C2B27">${code}</p>
          </td>
        </tr>
      </table>
    `,
    footer:
      "Centurion University of Technology and Management. Never share this code.",
  })

  await sendSmtp({ to, subject, text, html })
}
