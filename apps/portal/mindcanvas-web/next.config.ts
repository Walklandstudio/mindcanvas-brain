import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next.js 15+: expose server-only native deps to the Node runtime bundle
  serverExternalPackages: ['@react-pdf/renderer'],

  // If you had transpilePackages before, keep others but DO NOT include @react-pdf/renderer here.
  // transpilePackages: ['some-other-lib'], // <- leave out '@react-pdf/renderer'

  // Optional – keep whatever else you already use (images, eslint, experimental flags, etc.)
  reactStrictMode: true,
  // swcMinify is default in Next 15
};

export default nextConfig;

