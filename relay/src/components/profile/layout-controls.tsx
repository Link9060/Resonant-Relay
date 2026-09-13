'use client';

import { DEFAULT_LAYOUT, LAYOUT_EVENT, LAYOUT_KEY, layouts, normalizeLayout, resetLayout, saveLayout, type RelayLayout } from '@/lib/layout-mode';
import { Check, RotateCcw } from 'lucide-react';
import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(LAYOUT_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(LAYOUT_EVENT, onStoreChange);
  };
}

function getSnapshot(): RelayLayout {
  try { return normalizeLayout(window.localStorage.getItem(LAYOUT_KEY)); } catch { return DEFAULT_LAYOUT; }
}

export function LayoutControls({ value, onChange }: { value?: RelayLayout; onChange?: (layout: RelayLayout) => void } = {}) {
  const storedLayout = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_LAYOUT);
  const layout = value ?? storedLayout;
  const controlled = value !== undefined && Boolean(onChange);

  function choose(next: RelayLayout) {
    if (controlled) onChange?.(next);
    else saveLayout(next);
  }

  function reset() {
    if (controlled) onChange?.(DEFAULT_LAYOUT);
    else resetLayout();
  }

  return (
    <div className="relay-layout-controls w-full rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Desktop layout</h3>
          <p className="mt-1 text-xs leading-5 text-ink-faint">Rearrange Relay on larger screens. Mobile keeps its simpler fixed layout.</p>
        </div>
        <span className="hidden rounded-full border border-border px-2 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-ink-faint md:inline-flex">Desktop only</span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {layouts.map((option) => {
          const active = option.id === layout;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => choose(option.id)}
              className={`relay-layout-option rounded-xl border p-3 text-left transition ${active ? 'border-ink bg-ink text-canvas' : 'border-border bg-canvas text-ink hover:bg-surface-raised'}`}
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-sm font-semibold">{option.name}</span>
                  <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-[.12em] ${active ? 'text-canvas/65' : 'text-ink-faint'}`}>{option.signature}</span>
                </span>
                <span className={`grid h-6 w-6 place-items-center rounded-full border ${active ? 'border-canvas/30' : 'border-border'}`}>{active ? <Check size={13} /> : null}</span>
              </span>
              <span className={`mt-2 block text-xs leading-5 ${active ? 'text-canvas/70' : 'text-ink-faint'}`}>{option.description}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={reset}
        disabled={layout === DEFAULT_LAYOUT}
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-canvas px-3 text-sm font-medium text-ink transition hover:bg-surface-raised disabled:cursor-default disabled:opacity-40"
      >
        <RotateCcw size={15} />Reset desktop layout
      </button>
    </div>
  );
}