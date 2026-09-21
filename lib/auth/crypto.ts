import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { getEnv } from "@/lib/config/env"

export function randomId(bytes = 32): string {
  return randomBytes(bytes).toString("hex")
}

export function signSessionId(sid: string): string {
  const hmac = createHmac("sha256", getEnv().AUTH_SECRET)
    .update(sid)
    .digest("hex")
  return `${sid}.${hmac}`
}

export function parseSessionCookie(value: string | undefined): string | null {
  if (!value) return null
  const dot = value.indexOf(".")
  if (dot <= 0) return null
  const sid = value.slice(0, dot)
  const hmac = value.slice(dot + 1)
  if (!sid || !hmac) return null
  const expected = createHmac("sha256", getEnv().AUTH_SECRET)
    .update(sid)
    .digest("hex")
  const a = Buffer.from(hmac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return sid
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function safeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}
