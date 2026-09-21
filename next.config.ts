import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ["mongoose", "ioredis", "bullmq"],
};

export default nextConfig;
