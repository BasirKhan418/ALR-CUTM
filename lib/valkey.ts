import Redis, { type RedisOptions } from "ioredis"
import { getEnv } from "@/lib/config/env"

const globalForValkey = globalThis as typeof globalThis & {
  __valkey?: Redis
  __valkeyQueue?: Redis
}

function attachErrorHandler(client: Redis) {
  if (client.listenerCount("error") === 0) {
    client.on("error", (error) => {
      const code = (error as NodeJS.ErrnoException).code
      if (code === "ETIMEDOUT" || code === "ECONNREFUSED") {
        console.error(`[valkey] ${code} — check VALKEY_URL and that the host allows this IP`)
        return
      }
      console.error("[valkey]", error.message)
    })
  }
}

function valkeyOptions(queue: boolean): RedisOptions {
  const url = getEnv().VALKEY_URL
  const remoteTls = url.startsWith("rediss://")
  return {
    maxRetriesPerRequest: queue ? null : 1,
    connectTimeout: remoteTls ? 15_000 : 2_000,
    enableOfflineQueue: queue,
    family: 4,
    tls: remoteTls ? {} : undefined,
    retryStrategy(times) {
      if (times > (queue ? 12 : 4)) return null
      return Math.min(times * 300, 3000)
    },
  }
}

function createAppClient(): Redis {
  const client = new Redis(getEnv().VALKEY_URL, valkeyOptions(false))
  attachErrorHandler(client)
  return client
}

function createQueueClient(): Redis {
  const client = new Redis(getEnv().VALKEY_URL, valkeyOptions(true))
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
