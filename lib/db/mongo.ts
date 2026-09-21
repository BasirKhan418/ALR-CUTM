import mongoose from "mongoose"
import { getEnv } from "@/lib/config/env"

const globalForMongo = globalThis as typeof globalThis & {
  __mongooseConnect?: Promise<typeof mongoose>
}

export function connectMongo(): Promise<typeof mongoose> {
  if (!globalForMongo.__mongooseConnect) {
    globalForMongo.__mongooseConnect = mongoose
      .connect(getEnv().MONGODB_URI, {
        serverSelectionTimeoutMS: 1500,
      })
      .catch((error) => {
        globalForMongo.__mongooseConnect = undefined
        throw error
      })
  }
  return globalForMongo.__mongooseConnect
}
