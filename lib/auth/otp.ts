import { randomInt } from "node:crypto"
import { getEnv } from "@/lib/config/env"
import { getValkey } from "@/lib/valkey"
import { LOCK_SECONDS } from "@/lib/auth/constants"
import { safeEqualHex, sha256 } from "@/lib/auth/crypto"

export { normalizeEmail } from "@/lib/domain/email"

function otpKey(email: string): string {
  return `otp:${email}`
}

function attemptsKey(email: string): string {
  return `otp:attempts:${email}`
}

export function hashOtp(code: string): string {
  return sha256(code + getEnv().AUTH_SECRET)
}

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0")
}

export async function storeOtp(email: string, code: string): Promise<void> {
  const valkey = getValkey()
  await valkey.set(otpKey(email), hashOtp(code), "EX", getEnv().OTP_TTL_SECONDS)
  await valkey.del(attemptsKey(email))
}

export async function isOtpLocked(email: string): Promise<boolean> {
  const attempts = Number((await getValkey().get(attemptsKey(email))) ?? 0)
  return attempts >= 5
}

export async function verifyStoredOtp(
  email: string,
  code: string
): Promise<"ok" | "invalid" | "locked"> {
  if (await isOtpLocked(email)) return "locked"
  const stored = await getValkey().get(otpKey(email))
  const clean = code.replace(/\s/g, "")
  if (!stored || !/^\d{6}$/.test(clean) || !safeEqualHex(stored, hashOtp(clean))) {
    const attempts = await getValkey().incr(attemptsKey(email))
    if (attempts === 1) {
      await getValkey().expire(attemptsKey(email), LOCK_SECONDS)
    }
    if (attempts >= 5) return "locked"
    return "invalid"
  }
  await getValkey().del(otpKey(email), attemptsKey(email))
  return "ok"
}

export async function rateLimit(
  key: string,
  max: number,
  ttlSeconds: number
): Promise<boolean> {
  const valkey = getValkey()
  const count = await valkey.incr(key)
  if (count === 1) {
    await valkey.expire(key, ttlSeconds)
  }
  return count <= max
}
