import { readyValkey } from "@/lib/valkey"

export type AiProgress = {
  status: "QUEUED" | "DONE" | "FAILED"
  percent: number
  message?: string
}

function key(jobId: string) {
  return `job:progress:${jobId}`
}

export async function writeAiProgress(jobId: string, progress: AiProgress) {
  const valkey = await readyValkey()
  await valkey.set(key(jobId), JSON.stringify(progress), "EX", 3600)
}

export async function readAiProgress(jobId: string): Promise<AiProgress | null> {
  const valkey = await readyValkey()
  const raw = await valkey.get(key(jobId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as AiProgress
  } catch {
    return null
  }
}
