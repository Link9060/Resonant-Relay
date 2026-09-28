/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.NEXT_PUBLIC_RELAY_DEPLOY_TARGET === 'github-pages';

// Public Relay is mounted by the ARROW gateway at enterarrow.com/relay/.
// Keep GitHub Pages beta on its repository base path.
const basePath = isGitHubPages ? '/Resonant-Relay' : '/relay';

const nextConfig = {
  output: 'export',
  allowedDevOrigins: ['terminal.local'],
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
