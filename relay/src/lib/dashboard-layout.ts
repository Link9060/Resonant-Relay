'use client';

export type DashboardWidgetId =
  | 'overview'
  | 'weather'
  | 'tasks'
  | 'calendar'
  | 'today'
  | 'email'
  | 'chats'
  | 'quicknote'
  | 'focus'
  | 'nowplaying'
  | 'pinnedpeople'
  | 'quicklinks'
  | 'dayprogress'
  | 'schoolschedule'
  | 'assignments'
  | 'momentum'
  | 'sun'
  | 'countdowns'
  | 'recentfiles'
  | 'ravinbrief'
  | 'askravin';

export type DashboardWidgetSize = 'small' | 'medium' | 'wide';

export type DashboardWidgetPreference = {
  id: DashboardWidgetId;
  size: DashboardWidgetSize;
  visible: boolean;
};

export const DASHBOARD_LAYOUT_KEY = 'relay-dashboard-layout-v1';
export const DASHBOARD_LAYOUT_EVENT = 'relay-dashboard-layout-change';

export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetPreference[] = [
  { id: 'overview', size: 'wide', visible: true },
  { id: 'weather', size: 'medium', visible: true },
  { id: 'askravin', size: 'medium', visible: true },
  { id: 'tasks', size: 'medium', visible: true },
  { id: 'calendar', size: 'medium', visible: true },
  { id: 'email', size: 'medium', visible: true },
  { id: 'chats', size: 'medium', visible: true },
  { id: 'quicklinks', size: 'wide', visible: true },
  { id: 'today', size: 'wide', visible: false },
  { id: 'quicknote', size: 'medium', visible: false },
  { id: 'focus', size: 'small', visible: false },
  { id: 'nowplaying', size: 'medium', visible: false },
  { id: 'pinnedpeople', size: 'medium', visible: false },
  { id: 'dayprogress', size: 'small', visible: false },
  { id: 'schoolschedule', size: 'medium', visible: false },
  { id: 'assignments', size: 'medium', visible: false },
  { id: 'momentum', size: 'small', visible: false },
  { id: 'sun', size: 'small', visible: false },
  { id: 'countdowns', size: 'medium', visible: false },
  { id: 'recentfiles', size: 'medium', visible: false },
  { id: 'ravinbrief', size: 'wide', visible: false },
];

const validIds = new Set<DashboardWidgetId>(DEFAULT_DASHBOARD_LAYOUT.map((widget) => widget.id));
const validSizes = new Set<DashboardWidgetSize>(['small', 'medium', 'wide']);

export function normalizeDashboardLayout(value: unknown): DashboardWidgetPreference[] {
  if (!Array.isArray(value)) return DEFAULT_DASHBOARD_LAYOUT.map((widget) => ({ ...widget }));
  const seen = new Set<DashboardWidgetId>();
  const normalized: DashboardWidgetPreference[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const id = (raw as { id?: string }).id as DashboardWidgetId;
    if (!validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    const sizeValue = (raw as { size?: string }).size as DashboardWidgetSize;
    normalized.push({
      id,
      size: validSizes.has(sizeValue) ? sizeValue : DEFAULT_DASHBOARD_LAYOUT.find((item) => item.id === id)?.size ?? 'medium',
      visible: (raw as { visible?: unknown }).visible !== false,
    });
  }
  for (const widget of DEFAULT_DASHBOARD_LAYOUT) {
    if (!seen.has(widget.id)) normalized.push({ ...widget });
  }
  return normalized;
}

export function readDashboardLayout(): DashboardWidgetPreference[] {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_LAYOUT.map((widget) => ({ ...widget }));
  try {
    const raw = window.localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    return raw ? normalizeDashboardLayout(JSON.parse(raw)) : DEFAULT_DASHBOARD_LAYOUT.map((widget) => ({ ...widget }));
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT.map((widget) => ({ ...widget }));
  }
}

export function saveDashboardLayout(layout: DashboardWidgetPreference[]) {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeDashboardLayout(layout);
    window.localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(DASHBOARD_LAYOUT_EVENT, { detail: normalized }));
  } catch {
    // Storage can be unavailable in strict/private contexts.
  }
}

export function resetDashboardLayout() {
  saveDashboardLayout(DEFAULT_DASHBOARD_LAYOUT);
}

export function dashboardSpan(size: DashboardWidgetSize) {
  if (size === 'small') return 4;
  if (size === 'wide') return 12;
  return 6;
}
