'use client';

import {
  DEFAULT_EXPERIENCE,
  DEFAULT_INTENSITY,
  DEFAULT_LOCK_IN,
  DEFAULT_PALETTE,
  EXPERIENCE_EVENT,
  EXPERIENCE_KEY,
  INTENSITY_KEY,
  LOCK_IN_KEY,
  PALETTE_KEY,
  applyExperience,
  normalizeExperience,
  normalizePalette,
  readExperience,
  type RelayExperience,
  type RelayPalette,
} from '@/lib/experience-mode';
import {
  DEFAULT_LAYOUT,
  LAYOUT_EVENT,
  LAYOUT_KEY,
  normalizeLayout,
  readLayout,
  type RelayLayout,
} from '@/lib/layout-mode';
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
          visual_preferences: unknown;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          dashboard_presets?: unknown;
          visual_preferences?: unknown;
          updated_at?: string;
        };
        Update: Partial<{
          dashboard_presets: unknown;
          visual_preferences: unknown;
          updated_at: string;
        }>;
        Relationships: [];
      };
    };
  };
};

export type VisualPreferences = {
  layout: RelayLayout;
  experience: RelayExperience;
  palette: RelayPalette;
  intensity: number;
  lockIn: boolean;
};

export const DEFAULT_VISUAL_PREFERENCES: VisualPreferences = {
  layout: DEFAULT_LAYOUT,
  experience: DEFAULT_EXPERIENCE,
  palette: DEFAULT_PALETTE,
  intensity: DEFAULT_INTENSITY,
  lockIn: DEFAULT_LOCK_IN,
};

function client() {
  return createClient() as unknown as SupabaseClient<UiPreferencesDatabase>;
}

function clampIntensity(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : DEFAULT_INTENSITY;
}

export function normalizeVisualPreferences(value: unknown): VisualPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_VISUAL_PREFERENCES };
  const raw = value as Partial<Record<keyof VisualPreferences, unknown>>;
  return {
    layout: normalizeLayout(typeof raw.layout === 'string' ? raw.layout : null),
    experience: normalizeExperience(typeof raw.experience === 'string' ? raw.experience : null),
    palette: normalizePalette(typeof raw.palette === 'string' ? raw.palette : null),
    intensity: clampIntensity(raw.intensity),
    lockIn: raw.lockIn === true,
  };
}

export function visualPreferencesReady() {
  return typeof document !== 'undefined' && document.documentElement.dataset.relayVisualPrefsReady === 'true';
}

export function readActiveVisualPreferences(): VisualPreferences {
  const experience = readExperience();
  return {
    layout: readLayout(),
    experience: experience.experience,
    palette: experience.palette,
    intensity: experience.intensity,
    lockIn: experience.lockIn,
  };
}

export function applyAccountVisualPreferences(preferences: VisualPreferences) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeVisualPreferences(preferences);
  const root = document.documentElement;

  try {
    window.localStorage.setItem(LAYOUT_KEY, normalized.layout);
    window.localStorage.setItem(EXPERIENCE_KEY, normalized.experience);
    window.localStorage.setItem(PALETTE_KEY, normalized.palette);
    window.localStorage.setItem(INTENSITY_KEY, String(normalized.intensity));
    window.localStorage.setItem(LOCK_IN_KEY, String(normalized.lockIn));
  } catch {
    // Account storage remains authoritative when local storage is unavailable.
  }

  applyExperience(normalized.experience, normalized.palette, normalized.intensity, normalized.lockIn);
  if (window.matchMedia('(min-width: 768px)').matches) root.dataset.relayLayout = normalized.layout;
  else delete root.dataset.relayLayout;
  root.dataset.relayVisualPrefsReady = 'true';

  window.dispatchEvent(new CustomEvent(LAYOUT_EVENT, { detail: normalized.layout }));
  window.dispatchEvent(new CustomEvent(EXPERIENCE_EVENT, { detail: normalized }));
}

export async function syncVisualPreferencesWithAccount(userId: string) {
  const supabase = client();
  const { data, error } = await supabase
    .from('user_ui_preferences')
    .select('visual_preferences')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    applyAccountVisualPreferences(DEFAULT_VISUAL_PREFERENCES);
    return { preferences: { ...DEFAULT_VISUAL_PREFERENCES }, synced: false };
  }

  const hasSavedPreferences = Boolean(data?.visual_preferences);
  const preferences = hasSavedPreferences
    ? normalizeVisualPreferences(data?.visual_preferences)
    : { ...DEFAULT_VISUAL_PREFERENCES };

  applyAccountVisualPreferences(preferences);

  if (!hasSavedPreferences) {
    const { error: saveError } = await supabase
      .from('user_ui_preferences')
      .upsert({
        user_id: userId,
        visual_preferences: preferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    return { preferences, synced: !saveError };
  }

  return { preferences, synced: true };
}

export async function persistActiveVisualPreferences(userId: string) {
  if (!visualPreferencesReady()) return false;
  const preferences = normalizeVisualPreferences(readActiveVisualPreferences());
  const { error } = await client()
    .from('user_ui_preferences')
    .upsert({
      user_id: userId,
      visual_preferences: preferences,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  return !error;
}
