import { readyValkey } from "@/lib/valkey"

export async function withSignoffLock<T>(
  targetId: string,
  work: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  const valkey = await readyValkey()
  const key = `lock:signoff:${targetId}`
  const locked = await valkey.set(key, "1", "EX", 30, "NX")
  if (!locked) {
    return {
      ok: false,
      message: "Another sign-off decision is in progress. Try again.",
    }
  }
  try {
    return { ok: true, value: await work() }
  } finally {
    await valkey.del(key)
  }
}
