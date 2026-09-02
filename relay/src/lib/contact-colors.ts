export const CONTACT_COLORS = {
  slate: '#71717a',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  orange: '#f97316',
  green: '#22c55e',
  cyan: '#06b6d4',
  pink: '#ec4899',
} as const;

export type ContactColorKey = keyof typeof CONTACT_COLORS;

export const DEFAULT_CONTACT_COLOR: ContactColorKey = 'slate';

export function contactColor(key: string | null | undefined) {
  return CONTACT_COLORS[key as ContactColorKey] ?? CONTACT_COLORS[DEFAULT_CONTACT_COLOR];
}

export function contactDisplayName(
  profile: { display_name: string },
  preference?: { nickname: string | null } | null,
) {
  return preference?.nickname?.trim() || profile.display_name;
}
