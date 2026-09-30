/** @type {import('next').NextConfig} */
const deployTarget = process.env.NEXT_PUBLIC_RELAY_DEPLOY_TARGET ?? 'standalone';
const isGitHubPages = deployTarget === 'github-pages';
const isArrowHosted = deployTarget === 'arrow';
const basePath = isGitHubPages ? '/Resonant-Relay' : isArrowHosted ? '/relay' : '';

const nextConfig = {
  output: 'export',
  allowedDevOrigins: ['terminal.local'],
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
