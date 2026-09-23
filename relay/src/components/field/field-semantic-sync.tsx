'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

const IDLE_INTERVAL_MS = 10 * 60_000;
const RETRY_INTERVAL_MS = 60_000;
const NEXT_BATCH_MS = 1_500;
const INITIAL_DELAY_MS = 2_500;
const MAX_CHAINED_BATCHES = 8;

export function FieldSemanticSync() {
  useEffect(() => {
    let disposed = false;
    let timer = 0;
    let running = false;
    let chainedBatches = 0;

    const schedule = (delay: number) => {
      window.clearTimeout(timer);
      if (!disposed) timer = window.setTimeout(() => { void run(); }, delay);
    };

    const run = async () => {
      if (disposed || running) return;
      if (document.visibilityState === 'hidden') {
        schedule(RETRY_INTERVAL_MS);
        return;
      }

      running = true;
      try {
        const supabase = createClient() as any;
        const { data, error } = await supabase.functions.invoke('field-semantic-refresh', {
          body: {
            limit: 10,
            threshold: 0.72,
            neighbors: 8,
          },
        });

        if (error) throw error;

        const remaining = Number(data?.remaining ?? 0);
        if (remaining > 0 && chainedBatches < MAX_CHAINED_BATCHES) {
          chainedBatches += 1;
          schedule(NEXT_BATCH_MS);
        } else {
          chainedBatches = 0;
          schedule(remaining > 0 ? RETRY_INTERVAL_MS : IDLE_INTERVAL_MS);
        }
      } catch (error) {
        chainedBatches = 0;
        console.warn('Field semantic refresh skipped', error);
        schedule(RETRY_INTERVAL_MS);
      } finally {
        running = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        schedule(1_000);
      }
    };

    schedule(INITIAL_DELAY_MS);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
