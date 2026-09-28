/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.NEXT_PUBLIC_RELAY_DEPLOY_TARGET === 'github-pages';
const configuredBasePath = (process.env.NEXT_PUBLIC_RELAY_BASE_PATH || '').trim();
const normalizeBasePath = (value) => {
  if (!value || value === '/') return '';
  return `/${value.replace(/^\/+|\/+$/g, '')}`;
};
const basePath = configuredBasePath
  ? normalizeBasePath(configuredBasePath)
  : isGitHubPages
    ? '/Resonant-Relay'
    : '';

const nextConfig = {
  output: 'export',
  allowedDevOrigins: ['terminal.local'],
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig;
