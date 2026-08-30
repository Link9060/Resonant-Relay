/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/Resonant-Relay',
  assetPrefix: '/Resonant-Relay',
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
