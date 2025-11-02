// apps/web/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // DO NOT use output: 'export' (it removes API routes)
  output: 'standalone', // or just remove the output line entirely
  // If you use basePath, keep it here:
  // basePath: '/mindcanvas',
};
export default nextConfig;

