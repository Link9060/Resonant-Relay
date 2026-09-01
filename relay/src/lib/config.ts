export const BASE_PATH = '/Resonant-Relay';
export const SITE_URL = 'https://link9060.github.io/Resonant-Relay';
export const SUPABASE_URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
export const VAPID_PUBLIC_KEY = 'BCTFsU2mbSt5UPCIY9Sc2NoclRYl4wv826kVqwkdgEdgdxsT8YoGBvM9IZQfNQHYCTt5HMEhwxAH86ZKN9CC38I';

export function appUrl(path = '/') {
  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === BASE_PATH) normalized = '/';
  if (normalized.startsWith(`${BASE_PATH}/`)) normalized = normalized.slice(BASE_PATH.length);
  return `${BASE_PATH}${normalized === '/' ? '/' : normalized}`;
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
