import { readPlagiarismHourlyCap } from "@/lib/catalog/settings"
import { plagiarismHourKey } from "@/lib/domain/plagiarism"
import { readyValkey } from "@/lib/valkey"

export function plagiarismRateKey(campusId: string, at = new Date()) {
  return `rl:plagiarism:${campusId}:${plagiarismHourKey(at)}`
}

export async function consumePlagiarismSlot(campusId: string) {
  const cap = await readPlagiarismHourlyCap()
  const valkey = await readyValkey()
  const key = plagiarismRateKey(campusId)
  const used = await valkey.incr(key)
  if (used === 1) await valkey.expire(key, 2 * 60 * 60)
  if (used > cap) {
    await valkey.decr(key)
    return {
      allowed: false,
      used: used - 1,
      cap,
      percent: cap > 0 ? 100 : 0,
    }
  }
  return {
    allowed: true,
    used,
    cap,
    percent: cap > 0 ? Math.round((used / cap) * 100) : 0,
  }
}

export async function plagiarismUsage(campusId: string) {
  const cap = await readPlagiarismHourlyCap()
  const valkey = await readyValkey()
  const used = Number((await valkey.get(plagiarismRateKey(campusId))) ?? 0)
  return {
    used,
    cap,
    percent: cap > 0 ? Math.round((Math.min(used, cap) / cap) * 100) : 0,
  }
}
