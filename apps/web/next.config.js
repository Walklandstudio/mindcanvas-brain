/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/onboarding/(wizard)/:step',
        destination: '/onboarding/:step',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
