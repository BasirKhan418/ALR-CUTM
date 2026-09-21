export type AppEnv = {
  MONGODB_URI: string
  VALKEY_URL: string
  FILE_DIR: string
  APP_URL: string
  AUTH_SECRET: string
  SESSION_TTL_DAYS: number
  OTP_TTL_SECONDS: number
  OTP_DEV_LOG: boolean
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_REDIRECT_URI: string
  SMTP_HOST?: string
  SMTP_PORT: number
  SMTP_USER?: string
  SMTP_PASS?: string
  SMTP_FROM: string
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required. Copy .env.example to .env.local.`)
  }
  return value
}

function optional(name: string): string | undefined {
  let value = process.env[name]?.trim()
  if (!value) return undefined
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  return value || undefined
}

function integer(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function flag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase()
  if (!raw) return fallback
  return raw === "true" || raw === "1" || raw === "yes"
}

export function getEnv(): AppEnv {
  const APP_URL = process.env.APP_URL?.trim() || "http://localhost:3000"
  return {
    MONGODB_URI: required("MONGODB_URI"),
    VALKEY_URL: required("VALKEY_URL"),
    FILE_DIR: process.env.FILE_DIR?.trim() || "./.data/files",
    APP_URL,
    AUTH_SECRET: required("AUTH_SECRET"),
    SESSION_TTL_DAYS: integer("SESSION_TTL_DAYS", 7),
    OTP_TTL_SECONDS: integer("OTP_TTL_SECONDS", 600),
    OTP_DEV_LOG: flag("OTP_DEV_LOG", true),
    GOOGLE_CLIENT_ID: optional("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: optional("GOOGLE_CLIENT_SECRET"),
    GOOGLE_REDIRECT_URI:
      optional("GOOGLE_REDIRECT_URI") ||
      `${APP_URL.replace(/\/$/, "")}/api/auth/google/callback`,
    SMTP_HOST: optional("SMTP_HOST"),
    SMTP_PORT: integer("SMTP_PORT", 587),
    SMTP_USER: optional("SMTP_USER"),
    SMTP_PASS: optional("SMTP_PASS"),
    SMTP_FROM: optional("SMTP_FROM") || "alr@localhost",
  }
}

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
  )
}

export function isSmtpConfigured(env = getEnv()): boolean {
  return Boolean(env.SMTP_HOST)
}

export function isLocalhostApp(env = getEnv()): boolean {
  try {
    const { hostname } = new URL(env.APP_URL)
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return false
  }
}
