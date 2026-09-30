const deployTarget = process.env.NEXT_PUBLIC_RELAY_DEPLOY_TARGET ?? 'standalone';
const isGitHubPages = deployTarget === 'github-pages';
const isArrowHosted = deployTarget === 'arrow';
const relayChannel = process.env.NEXT_PUBLIC_RELAY_CHANNEL;

export const IS_BETA = relayChannel ? relayChannel === 'beta' : isGitHubPages;
export const ARROW_INTEGRATION_ENABLED =
  isGitHubPages ||
  isArrowHosted ||
  process.env.NEXT_PUBLIC_ARROW_INTEGRATION === '1';
export const PRODUCTION_VERSION = '1.0.7';
export const PRODUCTION_RELEASE_NAME = 'Focus Update';
export const DEVELOPMENT_VERSION = '1.0.8';
export const DEVELOPMENT_RELEASE_NAME = 'Next Update';
export const APP_VERSION = IS_BETA ? DEVELOPMENT_VERSION : PRODUCTION_VERSION;
export const RELEASE_LABEL = IS_BETA
  ? `Beta ${APP_VERSION} · ${DEVELOPMENT_RELEASE_NAME}`
  : `${APP_VERSION} · ${PRODUCTION_RELEASE_NAME}`;
export const COMPACT_RELEASE_LABEL = IS_BETA ? `Beta ${APP_VERSION}` : APP_VERSION;
export const APP_TITLE = IS_BETA
  ? `Relay · Beta ${APP_VERSION} · ${DEVELOPMENT_RELEASE_NAME}`
  : `Relay · ${APP_VERSION} · ${PRODUCTION_RELEASE_NAME}`;
export const BASE_PATH = isGitHubPages ? '/Resonant-Relay' : isArrowHosted ? '/relay' : '';
export const PUBLIC_SITE_URL = 'https://resonantrelay.org';
export const BETA_SITE_URL = 'https://link9060.github.io/Resonant-Relay';
export const ARROW_SITE_URL = 'https://enterarrow.com';
export const ARROW_ORBIT_URL = process.env.NEXT_PUBLIC_ARROW_ORBIT_URL
  ?? (isArrowHosted ? '/orbit/' : 'https://link9060.github.io/Resonant-Orbit/');
export const ARROW_SHELL_BASE_URL = (
  process.env.NEXT_PUBLIC_ARROW_SHELL_BASE_URL
  ?? (isArrowHosted ? '/orbit' : 'https://link9060.github.io/Resonant-Orbit')
).replace(/\/+$/, '');
export const ARROW_AUTH_ENTRY_URL = process.env.NEXT_PUBLIC_ARROW_AUTH_ENTRY_URL?.trim() ?? '';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (isGitHubPages ? BETA_SITE_URL : isArrowHosted ? `${ARROW_SITE_URL}/relay` : PUBLIC_SITE_URL);
export const SUPABASE_URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
export const VAPID_PUBLIC_KEY = 'BB9uLQEkhGFPyhDZMCNWFy-TwbYqyv1mz4Q8irl50o9pBaESA5d0sImf7Gd55SNG_AqfVGbyZ5e_odALU_rxYuA';

export function isAllowedArrowReturnPath(pathname: string) {
  if (isGitHubPages) {
    return pathname === '/Resonant-Orbit' || pathname.startsWith('/Resonant-Orbit/');
  }

  if (isArrowHosted) {
    const centerPrefixes = ['/orbit', '/relay', '/ravin', '/atlas', '/waypoint'];
    return pathname === '/' || centerPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  return false;
}

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

export function authEntryUrl(nextPath = appPageUrl('/')) {
  if (!ARROW_INTEGRATION_ENABLED || !ARROW_AUTH_ENTRY_URL) return appPageUrl('/login');
  const url = new URL(ARROW_AUTH_ENTRY_URL, ARROW_SITE_URL);
  url.searchParams.set('next', nextPath);
  return url.toString();
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
