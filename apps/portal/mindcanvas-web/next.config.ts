// mindcanvas-web/next.config.js
const path = require("path");

/** @type {import('next').NextConfig} */
module.exports = {
  outputFileTracingRoot: path.join(__dirname, ".."),
  // eslint: { ignoreDuringBuilds: true }, // (optional emergency lever)
};

