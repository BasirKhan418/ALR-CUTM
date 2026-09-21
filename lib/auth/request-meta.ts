import { headers } from "next/headers"

export async function requestIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown"
  return h.get("x-real-ip")?.trim() || "unknown"
}

export async function requestUserAgent(): Promise<string> {
  const h = await headers()
  return h.get("user-agent")?.slice(0, 300) || "unknown"
}
