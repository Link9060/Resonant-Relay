'use client';

export const LAYOUT_KEY = 'relay-desktop-layout';
export const LAYOUT_EVENT = 'relay-desktop-layout-change';

export type RelayLayout = 'classic' | 'focus' | 'topbar' | 'floating';

export const DEFAULT_LAYOUT: RelayLayout = 'classic';

export const layouts: Array<{
  id: RelayLayout;
  name: string;
  signature: string;
  description: string;
}> = [
  { id: 'classic', name: 'Classic', signature: 'Sidebar', description: 'The standard Relay layout with a full left sidebar.' },
  { id: 'focus', name: 'Focus Rail', signature: 'Hover rail', description: 'A slim icon rail that expands automatically when you move into it.' },
  { id: 'topbar', name: 'Topbar', signature: 'Horizontal', description: 'Moves primary navigation across the top and frees the left edge.' },
  { id: 'floating', name: 'Floating Dock', signature: 'Bottom dock', description: 'Moves primary navigation into a floating desktop dock along the bottom.' },
];

export function normalizeLayout(value: string | null): RelayLayout {
  return layouts.some((layout) => layout.id === value) ? value as RelayLayout : DEFAULT_LAYOUT;
}

export function readLayout(): RelayLayout {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  try { return normalizeLayout(window.localStorage.getItem(LAYOUT_KEY)); } catch { return DEFAULT_LAYOUT; }
}

export function saveLayout(layout: RelayLayout) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAYOUT_KEY, layout);
    document.documentElement.dataset.relayLayout = layout;
    window.dispatchEvent(new CustomEvent<RelayLayout>(LAYOUT_EVENT, { detail: layout }));
  } catch {
    // Storage can be unavailable in strict/private contexts.
  }
}

export function resetLayout() {
  saveLayout(DEFAULT_LAYOUT);
}
