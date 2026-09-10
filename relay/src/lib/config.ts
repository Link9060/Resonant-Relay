const isGitHubPages = process.env.NEXT_PUBLIC_RELAY_DEPLOY_TARGET === 'github-pages';

export const IS_BETA = isGitHubPages;
export const PRODUCTION_VERSION = '1.0.2';
export const DEVELOPMENT_VERSION = '1.0.3';
export const APP_VERSION = IS_BETA ? DEVELOPMENT_VERSION : PRODUCTION_VERSION;
export const RELEASE_LABEL = IS_BETA ? `Beta ${APP_VERSION}` : APP_VERSION;
export const APP_TITLE = IS_BETA ? `Relay · Beta ${APP_VERSION}` : `Relay · ${APP_VERSION}`;
export const BASE_PATH = isGitHubPages ? '/Resonant-Relay' : '';
export const PUBLIC_SITE_URL = 'https://resonantrelay.org';
export const BETA_SITE_URL = 'https://link9060.github.io/Resonant-Relay';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (isGitHubPages ? BETA_SITE_URL : PUBLIC_SITE_URL);
export const SUPABASE_URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
export const VAPID_PUBLIC_KEY = 'BCTFsU2mbSt5UPCIY9Sc2NoclRYl4wv826kVqwkdgEdgdxsT8YoGBvM9IZQfNQHYCTt5HMEhwxAH86ZKN9CC38I';

export function appPathname(pathname: string) {
  if (pathname === BASE_PATH) return '/';
  if (pathname.startsWith(`${BASE_PATH}/`)) return pathname.slice(BASE_PATH.length) || '/';
  return pathname || '/';
}

export function appUrl(path = '/') {
  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === BASE_PATH) normalized = '/';
  if (normalized.startsWith(`${BASE_PATH}/`)) normalized = normalized.slice(BASE_PATH.length);
  return `${BASE_PATH}${normalized === '/' ? '/' : normalized}`;
}

export function siteUrl(path = '/') {
  const base = SITE_URL.replace(/\/+$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

const STAFF_WORKSPACE_REDIRECTS: Record<string, string> = {
  '/admin?section=users': '/admin/users',
  '/admin?section=moderation': '/admin/moderation',
  '/admin?section=analytics': '/admin/analytics',
  '/admin?section=system': '/admin/system',
  '/admin?section=activity': '/admin/activity',
};

// GitHub Pages serves every exported route from a directory index. Linking to
// the trailing-slash URL avoids an extra redirect and is more reliable in
// installed/mobile browsers, while appUrl remains available for assets such as
// the service worker.
export function appPageUrl(path = '/') {
  const resolvedPath = STAFF_WORKSPACE_REDIRECTS[path] ?? path;
  const url = appUrl(resolvedPath);
  const suffixIndex = url.search(/[?#]/);
  const pathname = suffixIndex === -1 ? url : url.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : url.slice(suffixIndex);
  return `${pathname.endsWith('/') ? pathname : `${pathname}/`}${suffix}`;
}

export function staticDetailPath(kind: 'chats' | 'planner', id: string) {
  return `/${kind}/view/?id=${encodeURIComponent(id)}`;
}

export function normalizeAppLink(link: string) {
  const chat = link.match(/^\/chats\/([^/?#]+)/);
  if (chat?.[1]) return staticDetailPath('chats', chat[1]);
  const plan = link.match(/^\/planner\/([^/?#]+)/);
  if (plan?.[1]) return staticDetailPath('planner', plan[1]);
  return link;
}
