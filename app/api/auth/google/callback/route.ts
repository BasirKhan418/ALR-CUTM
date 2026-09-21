import { redirect } from "next/navigation"
import { connection } from "next/server"
import { completeLogin } from "@/lib/auth/complete-login"
import {
  consumeOAuthState,
  exchangeGoogleCode,
  googleEnabled,
} from "@/lib/auth/google"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import { isAllowedSignInEmail } from "@/lib/domain/email"
import { firstShellHref } from "@/lib/domain/roles"

export async function GET(request: Request) {
  await connection()
  if (!googleEnabled()) {
    redirect("/login?error=google_not_configured")
  }

  const url = new URL(request.url)
  const error = url.searchParams.get("error")
  if (error) {
    redirect("/login?error=google_denied")
  }

  const stateOk = await consumeOAuthState(url.searchParams.get("state"))
  if (!stateOk) {
    redirect("/login?error=google_denied")
  }

  const code = url.searchParams.get("code")
  if (!code) {
    redirect("/login?error=google_denied")
  }

  let email: string
  let sub: string
  try {
    const google = await exchangeGoogleCode(code)
    email = google.email
    sub = google.sub
  } catch {
    redirect("/login?error=google_denied")
  }

  if (!isAllowedSignInEmail(email)) {
    redirect("/login?error=domain")
  }

  await connectMongo()
  const user = await User.findOne({ email })
  if (!user || !user.active) {
    redirect("/login?error=not_provisioned")
  }

  if (!user.googleSub) {
    const taken = await User.findOne({ googleSub: sub })
    if (taken && String(taken._id) !== String(user._id)) {
      redirect("/login?error=not_provisioned")
    }
    user.googleSub = sub
  }

  user.lastLoginAt = new Date()
  user.lastLoginMethod = "GOOGLE"
  await user.save()
  await completeLogin(user, "GOOGLE")
  redirect(firstShellHref(user.roles))
}
