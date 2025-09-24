import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // allow builds to succeed even if ESLint finds errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
