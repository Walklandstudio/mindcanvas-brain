const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // moved out of "experimental"
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  experimental: {
    // keep other experimental flags here if you have any
  },
};

module.exports = nextConfig;
