import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ensure we can import node-only libs within server routes
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
  // Force transpile if the package ships untranspiled code
  transpilePackages: ['@react-pdf/renderer'],

  // If you’re using images or other features, keep your existing settings here
};

export default nextConfig;

