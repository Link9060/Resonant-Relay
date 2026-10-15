'use client';

export type AppRole = 'user' | 'moderator' | 'admin' | 'owner';
export const ROLE_PREVIEW_KEY = 'relay-owner-role-preview';
export const ROLE_PREVIEW_EVENT = 'relay-role-preview-change';
const ROLES: AppRole[] = ['user', 'moderator', 'admin', 'owner'];
function accountId(): string | null {
  try { return JSON.parse(window.localStorage.getItem('sb-cnorozrjugxpanpfmssa-auth-token') || 'null')?.user?.id || null; }
  catch { return null; }
}
export function getRolePreview(actualRole: AppRole): AppRole {
  if (actualRole !== 'owner' || typeof window === 'undefined') return actualRole;
  try {
    const saved = JSON.parse(window.localStorage.getItem(ROLE_PREVIEW_KEY) || 'null');
    return saved?.userId && saved.userId === accountId() && ROLES.includes(saved.role) ? saved.role : 'owner';
  } catch { return 'owner'; }
}
export function setRolePreview(role: AppRole) {
  if (typeof window === 'undefined' || !ROLES.includes(role)) return;
  const userId = accountId();
  if (!userId) return;
  try { window.localStorage.setItem(ROLE_PREVIEW_KEY, JSON.stringify({ userId, role })); } catch { return; }
  window.dispatchEvent(new CustomEvent(ROLE_PREVIEW_EVENT, { detail: role }));
}
export function clearRolePreview() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(ROLE_PREVIEW_KEY); } catch { return; }
  window.dispatchEvent(new CustomEvent(ROLE_PREVIEW_EVENT, { detail: 'owner' }));
}
