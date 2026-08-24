import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@planify/types", "@planify/schemas"],
}

export default nextConfig
