import Redis from "ioredis"
import { getEnv } from "@/lib/config/env"

const globalForValkey = globalThis as typeof globalThis & {
  __valkey?: Redis
  __valkeyQueue?: Redis
}

function attachErrorHandler(client: Redis) {
  if (client.listenerCount("error") === 0) {
    client.on("error", () => {
      // Connection errors are returned to callers; do not crash the process.
    })
  }
}

function createAppClient(): Redis {
  const client = new Redis(getEnv().VALKEY_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1500,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 4) return null
      return Math.min(times * 200, 1000)
    },
  })
  attachErrorHandler(client)
  return client
}

function createQueueClient(): Redis {
  const client = new Redis(getEnv().VALKEY_URL, {
    maxRetriesPerRequest: null,
    connectTimeout: 1500,
    retryStrategy(times) {
      if (times > 8) return null
      return Math.min(times * 200, 2000)
    },
  })
  attachErrorHandler(client)
  return client
}

function isUsable(client: Redis | undefined): client is Redis {
  return Boolean(client && client.status !== "end")
}

export function getValkey(): Redis {
  if (!isUsable(globalForValkey.__valkey)) {
    globalForValkey.__valkey = createAppClient()
  }
  return globalForValkey.__valkey
}

export function getValkeyQueue(): Redis {
  if (!isUsable(globalForValkey.__valkeyQueue)) {
    globalForValkey.__valkeyQueue = createQueueClient()
    const queues = globalThis as typeof globalThis & {
      __alrQueues?: Record<string, unknown>
    }
    queues.__alrQueues = {}
  }
  return globalForValkey.__valkeyQueue
}
