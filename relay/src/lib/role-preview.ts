'use client';

export type AppRole = 'user' | 'moderator' | 'admin' | 'owner';

export const ROLE_PREVIEW_KEY = 'relay-owner-role-preview';
export const ROLE_PREVIEW_EVENT = 'relay-role-preview-change';

export function getRolePreview(actualRole: AppRole): AppRole {
  if (actualRole !== 'owner' || typeof window === 'undefined') return actualRole;
  const saved = window.localStorage.getItem(ROLE_PREVIEW_KEY) as AppRole | null;
  return saved && ['user', 'moderator', 'admin', 'owner'].includes(saved) ? saved : 'owner';
}

export function setRolePreview(role: AppRole) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ROLE_PREVIEW_KEY, role);
  window.dispatchEvent(new CustomEvent(ROLE_PREVIEW_EVENT, { detail: role }));
}

export function clearRolePreview() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ROLE_PREVIEW_KEY);
  window.dispatchEvent(new CustomEvent(ROLE_PREVIEW_EVENT, { detail: 'owner' }));
}
