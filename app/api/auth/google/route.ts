import { redirect } from "next/navigation"
import { connection } from "next/server"
import { createGoogleAuthUrl, googleEnabled } from "@/lib/auth/google"

export async function GET() {
  await connection()
  if (!googleEnabled()) {
    redirect("/login?error=google_not_configured")
  }
  redirect(await createGoogleAuthUrl())
}
