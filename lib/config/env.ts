export type AppEnv = {
  MONGODB_URI: string
  VALKEY_URL: string
  FILE_DIR: string
  APP_URL: string
}

function required(name: keyof AppEnv): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required. Copy .env.example to .env.local.`)
  }
  return value
}

export function getEnv(): AppEnv {
  return {
    MONGODB_URI: required("MONGODB_URI"),
    VALKEY_URL: required("VALKEY_URL"),
    FILE_DIR: process.env.FILE_DIR?.trim() || "./.data/files",
    APP_URL: process.env.APP_URL?.trim() || "http://localhost:3000",
  }
}
