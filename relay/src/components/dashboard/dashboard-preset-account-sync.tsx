'use client';

import {
  DASHBOARD_CUSTOM_PRESETS_EVENT,
  DASHBOARD_CUSTOM_PRESETS_KEY,
  readCustomDashboardPresets,
} from '@/lib/dashboard-layout';
import {
  persistCustomDashboardPresetsToAccount,
  syncCustomDashboardPresetsWithAccount,
} from '@/lib/dashboard-presets-account';
import { useEffect } from 'react';

export function DashboardPresetAccountSync() {
  useEffect(() => {
    let active = true;
    let syncing = false;

    const pushLocalPresets = async () => {
      if (!active || syncing) return;
      syncing = true;
      try {
        await persistCustomDashboardPresetsToAccount(readCustomDashboardPresets());
      } finally {
        syncing = false;
      }
    };

    void (async () => {
      syncing = true;
      try {
        await syncCustomDashboardPresetsWithAccount();
      } finally {
        syncing = false;
      }
    })();

    const onPresetChange = () => { void pushLocalPresets(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === DASHBOARD_CUSTOM_PRESETS_KEY) void pushLocalPresets();
    };

    window.addEventListener(DASHBOARD_CUSTOM_PRESETS_EVENT, onPresetChange);
    window.addEventListener('storage', onStorage);
    return () => {
      active = false;
      window.removeEventListener(DASHBOARD_CUSTOM_PRESETS_EVENT, onPresetChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
