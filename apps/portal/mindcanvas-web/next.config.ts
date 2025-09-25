// mindcanvas-web/next.config.js
const path = require("path");

/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    // helps silence workspace-root confusion when repo has stuff above this folder
    outputFileTracingRoot: path.join(__dirname, ".."),
  },
  // If ESLint ever blocks deploys again, you can temporarily enable:
  // eslint: { ignoreDuringBuilds: true },
};

