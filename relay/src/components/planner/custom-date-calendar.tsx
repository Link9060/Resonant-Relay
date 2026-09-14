'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function CustomDateCalendar({
  value,
  onChange,
  minDate,
}: {
  value: string[];
  onChange: (dates: string[]) => void;
  minDate?: string;
}) {
  const initial = value[0] ? parseDateKey(value[0]) : new Date();
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1, 12));
  const selected = useMemo(() => new Set(value.filter(Boolean)), [value]);
  const days = useMemo(() => buildMonthGrid(month), [month]);

  function toggle(date: Date) {
    const key = dateKey(date);
    if (minDate && key < minDate) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next].sort());
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-canvas">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <button
          type="button"
          onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1, 12))}
          aria-label="Previous month"
          className="grid h-8 w-8 place-items-center rounded-md text-ink-faint transition hover:bg-surface hover:text-ink"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-sm font-semibold text-ink">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
        <button
          type="button"
          onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1, 12))}
          aria-label="Next month"
          className="grid h-8 w-8 place-items-center rounded-md text-ink-faint transition hover:bg-surface hover:text-ink"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day, index) => <div key={`${day}-${index}`} className="py-1 text-center text-[10px] font-semibold text-ink-faint">{day}</div>)}
          {days.map((date) => {
            const key = dateKey(date);
            const inMonth = date.getMonth() === month.getMonth();
            const active = selected.has(key);
            const disabled = Boolean(minDate && key < minDate);
            const today = key === dateKey(new Date());
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(date)}
                disabled={disabled}
                aria-pressed={active}
                className={`relative aspect-square rounded-lg text-xs font-medium transition ${active ? 'bg-ink text-canvas shadow-sm' : inMonth ? 'text-ink hover:bg-surface' : 'text-ink-faint hover:bg-surface'} ${disabled ? 'cursor-not-allowed opacity-25 hover:bg-transparent' : ''}`}
              >
                {date.getDate()}
                {today && !active && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-ink-muted" />}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-ink-faint">{selected.size} {selected.size === 1 ? 'date' : 'dates'} selected</p>
          {selected.size > 0 && (
            <button type="button" onClick={() => onChange([])} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildMonthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [yearRaw, monthRaw, dayRaw] = value.split('-').map(Number);
  return new Date(yearRaw ?? new Date().getFullYear(), (monthRaw ?? 1) - 1, dayRaw ?? 1, 12);
}
