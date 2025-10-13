// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Keep this false if you want lint to block bad builds.
  // Flip to true temporarily only if you must unblock a deploy.
  eslint: { ignoreDuringBuilds: false },

  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig

