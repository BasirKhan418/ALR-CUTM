import { getEnv, isGoogleConfigured } from "@/lib/config/env"
import { readyValkey } from "@/lib/valkey"
import { OAUTH_STATE_SECONDS } from "@/lib/auth/constants"
import { randomId } from "@/lib/auth/crypto"

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

export function googleEnabled(): boolean {
  return isGoogleConfigured()
}

export async function createGoogleAuthUrl(): Promise<string> {
  const env = getEnv()
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google sign-in is not configured")
  }
  const state = randomId(16)
  await (await readyValkey()).set(`oauth:state:${state}`, "1", "EX", OAUTH_STATE_SECONDS)
  const url = new URL(AUTH_URL)
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID)
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid email profile")
  url.searchParams.set("state", state)
  url.searchParams.set("prompt", "select_account")
  return url.toString()
}

export async function consumeOAuthState(state: string | null): Promise<boolean> {
  if (!state) return false
  const key = `oauth:state:${state}`
  const valkey = await readyValkey()
  const exists = await valkey.get(key)
  if (!exists) return false
  await valkey.del(key)
  return true
}

export async function exchangeGoogleCode(code: string): Promise<{
  email: string
  sub: string
}> {
  const env = getEnv()
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google sign-in is not configured")
  }
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  })
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!tokenRes.ok) {
    throw new Error("Google token exchange failed")
  }
  const tokens = (await tokenRes.json()) as {
    access_token?: string
    id_token?: string
  }
  let email = ""
  let sub = ""
  if (tokens.access_token) {
    const infoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (infoRes.ok) {
      const info = (await infoRes.json()) as {
        email?: string
        sub?: string
        email_verified?: boolean
      }
      if (info.email_verified === false) {
        throw new Error("Google email is not verified")
      }
      email = info.email?.trim().toLowerCase() ?? ""
      sub = info.sub ?? ""
    }
  }
  if ((!email || !sub) && tokens.id_token) {
    const payload = decodeIdToken(tokens.id_token)
    email = email || payload.email?.trim().toLowerCase() || ""
    sub = sub || payload.sub || ""
  }
  if (!email || !sub) {
    throw new Error("Google did not return an email")
  }
  return { email, sub }
}

function decodeIdToken(idToken: string): { email?: string; sub?: string } {
  const payload = idToken.split(".")[1]
  if (!payload) return {}
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string
      sub?: string
    }
  } catch {
    return {}
  }
}
