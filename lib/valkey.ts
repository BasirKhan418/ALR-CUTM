import Redis, { type RedisOptions } from "ioredis"
import { getEnv } from "@/lib/config/env"

const globalForValkey = globalThis as typeof globalThis & {
  __valkey?: Redis
  __valkeyQueue?: Redis
}

const DEAD = new Set(["end", "close", "wait"])

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

function connectTimeoutMs(): number {
  return getEnv().VALKEY_URL.startsWith("rediss://") ? 15_000 : 2_000
}

function valkeyOptions(queue: boolean): RedisOptions {
  const url = getEnv().VALKEY_URL
  const remoteTls = url.startsWith("rediss://")
  return {
    maxRetriesPerRequest: queue ? null : 1,
    connectTimeout: connectTimeoutMs(),
    // Queue commands while the TCP/TLS handshake finishes. Without this, the
    // first login after boot throws "Stream isn't writeable".
    enableOfflineQueue: true,
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
  return Boolean(client && !DEAD.has(client.status))
}

function discard(client: Redis | undefined) {
  if (!client) return
  try {
    client.disconnect(false)
  } catch {
    // already closed
  }
}

function waitForReady(client: Redis): Promise<void> {
  if (client.status === "ready") return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off("ready", onReady)
      client.off("end", onEnd)
      reject(new Error("Valkey connect timeout — check VALKEY_URL"))
    }, connectTimeoutMs() + 500)
    const onReady = () => {
      clearTimeout(timer)
      client.off("end", onEnd)
      resolve()
    }
    const onEnd = () => {
      clearTimeout(timer)
      client.off("ready", onReady)
      reject(new Error("Valkey connection closed — check VALKEY_URL"))
    }
    client.once("ready", onReady)
    client.once("end", onEnd)
  })
}

export function getValkey(): Redis {
  if (!isUsable(globalForValkey.__valkey)) {
    discard(globalForValkey.__valkey)
    globalForValkey.__valkey = createAppClient()
  }
  return globalForValkey.__valkey
}

export async function readyValkey(): Promise<Redis> {
  const client = getValkey()
  if (client.status !== "ready") {
    await waitForReady(client)
  }
  return client
}

export function getValkeyQueue(): Redis {
  if (!isUsable(globalForValkey.__valkeyQueue)) {
    discard(globalForValkey.__valkeyQueue)
    globalForValkey.__valkeyQueue = createQueueClient()
    const queues = globalThis as typeof globalThis & {
      __alrQueues?: Record<string, unknown>
    }
    queues.__alrQueues = {}
  }
  return globalForValkey.__valkeyQueue
}
