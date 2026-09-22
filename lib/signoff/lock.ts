import { readyValkey } from "@/lib/valkey"

export async function withCaseLock<T>(targetId: string, work: () => Promise<T>) {
  return withNamedLock(`lock:case:${targetId}`, work, "Another case decision is in progress. Try again.")
}

export async function withSignoffLock<T>(
  targetId: string,
  work: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  return withNamedLock(
    `lock:signoff:${targetId}`,
    work,
    "Another sign-off decision is in progress. Try again."
  )
}

async function withNamedLock<T>(
  key: string,
  work: () => Promise<T>,
  busy: string
): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  const valkey = await readyValkey()
  const locked = await valkey.set(key, "1", "EX", 30, "NX")
  if (!locked) {
    return { ok: false, message: busy }
  }
  try {
    return { ok: true, value: await work() }
  } finally {
    await valkey.del(key)
  }
}
