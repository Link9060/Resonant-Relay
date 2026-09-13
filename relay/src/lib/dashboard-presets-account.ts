'use client';

import {
  DASHBOARD_CUSTOM_PRESETS_EVENT,
  DASHBOARD_CUSTOM_PRESETS_KEY,
  normalizeDashboardLayout,
  readCustomDashboardPresets,
  type DashboardCustomPreset,
} from '@/lib/dashboard-layout';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

type UiPreferencesDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: Database['public']['Tables'] & {
      user_ui_preferences: {
        Row: {
          user_id: string;
          dashboard_presets: unknown;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          dashboard_presets?: unknown;
          updated_at?: string;
        };
        Update: Partial<{
          dashboard_presets: unknown;
          updated_at: string;
        }>;
        Relationships: [];
      };
    };
  };
};

function client() {
  return createClient() as unknown as SupabaseClient<UiPreferencesDatabase>;
}

function cleanName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 40) : '';
}

function normalizePreset(value: unknown): DashboardCustomPreset | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as {
    id?: unknown;
    name?: unknown;
    widgets?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  const name = cleanName(raw.name);
  if (!name || !Array.isArray(raw.widgets)) return null;
  const now = new Date().toISOString();
  const createdAt = typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : now;
  const updatedAt = typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : createdAt;
  return {
    id: raw.id,
    name,
    widgets: normalizeDashboardLayout(raw.widgets),
    createdAt,
    updatedAt,
  };
}

function normalizePresets(value: unknown): DashboardCustomPreset[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizePreset)
    .filter((preset): preset is DashboardCustomPreset => Boolean(preset))
    .slice(0, 24);
}

function updatedTime(preset: DashboardCustomPreset) {
  const value = new Date(preset.updatedAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

function mergePresets(local: DashboardCustomPreset[], remote: DashboardCustomPreset[]) {
  const sorted = [...remote, ...local].sort((a, b) => updatedTime(b) - updatedTime(a));
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();
  const merged: DashboardCustomPreset[] = [];

  for (const preset of sorted) {
    const nameKey = preset.name.toLowerCase();
    if (usedIds.has(preset.id) || usedNames.has(nameKey)) continue;
    usedIds.add(preset.id);
    usedNames.add(nameKey);
    merged.push(preset);
    if (merged.length >= 24) break;
  }

  return merged;
}

function cachePresets(presets: DashboardCustomPreset[]) {
  const normalized = normalizePresets(presets);
  try {
    window.localStorage.setItem(DASHBOARD_CUSTOM_PRESETS_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(DASHBOARD_CUSTOM_PRESETS_EVENT, { detail: normalized }));
  } catch {
    // Relay can still use account storage when local storage is unavailable.
  }
  return normalized;
}

async function currentUserId() {
  const supabase = client();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function persistCustomDashboardPresetsToAccount(presets: DashboardCustomPreset[]) {
  const userId = await currentUserId();
  if (!userId) return false;
  const normalized = normalizePresets(presets);
  const { error } = await client()
    .from('user_ui_preferences')
    .upsert({
      user_id: userId,
      dashboard_presets: normalized,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  return !error;
}

export async function syncCustomDashboardPresetsWithAccount() {
  const local = readCustomDashboardPresets();
  const userId = await currentUserId();
  if (!userId) return local;

  const supabase = client();
  const { data, error } = await supabase
    .from('user_ui_preferences')
    .select('dashboard_presets')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return local;

  const remote = normalizePresets(data?.dashboard_presets ?? []);
  const merged = cachePresets(mergePresets(local, remote));

  if (!data || JSON.stringify(remote) !== JSON.stringify(merged)) {
    await supabase
      .from('user_ui_preferences')
      .upsert({
        user_id: userId,
        dashboard_presets: merged,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }

  return merged;
}
