import { Queue } from "bullmq"
import { getValkeyQueue } from "@/lib/valkey"

export const QUEUE_NAMES = {
  scoring: "scoring",
  plagiarism: "plagiarism",
  codeSimilarity: "code-similarity",
  exports: "exports",
  notify: "notify",
  maintenance: "maintenance",
} as const

const globalForQueues = globalThis as typeof globalThis & {
  __alrQueues?: Record<string, Queue>
}

function queue(name: string): Queue {
  if (!globalForQueues.__alrQueues) {
    globalForQueues.__alrQueues = {}
  }
  if (!globalForQueues.__alrQueues[name]) {
    globalForQueues.__alrQueues[name] = new Queue(name, {
      connection: getValkeyQueue(),
    })
  }
  return globalForQueues.__alrQueues[name]
}

export const scoringQueue = () => queue(QUEUE_NAMES.scoring)
export const plagiarismQueue = () => queue(QUEUE_NAMES.plagiarism)
export const codeSimilarityQueue = () => queue(QUEUE_NAMES.codeSimilarity)
export const exportsQueue = () => queue(QUEUE_NAMES.exports)
export const notifyQueue = () => queue(QUEUE_NAMES.notify)
export const maintenanceQueue = () => queue(QUEUE_NAMES.maintenance)

export function resetQueues() {
  globalForQueues.__alrQueues = {}
}

export function allQueues(): Queue[] {
  return [
    scoringQueue(),
    plagiarismQueue(),
    codeSimilarityQueue(),
    exportsQueue(),
    notifyQueue(),
    maintenanceQueue(),
  ]
}
