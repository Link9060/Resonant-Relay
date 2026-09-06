/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.NEXT_PUBLIC_RELAY_DEPLOY_TARGET === 'github-pages';
const basePath = isGitHubPages ? '/Resonant-Relay' : '';

const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
