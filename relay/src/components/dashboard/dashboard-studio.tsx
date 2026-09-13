'use client';

import { LayoutControls } from '@/components/profile/layout-controls';
import {
  DASHBOARD_PRESETS,
  DASHBOARD_SIZE_PRESETS,
  DEFAULT_DASHBOARD_LAYOUT,
  applyDashboardPreset,
  applyDashboardSize,
  resizeDashboardWidget,
  type DashboardWidgetId,
  type DashboardWidgetPreference,
  type DashboardWidgetSize,
} from '@/lib/dashboard-layout';
import type { RelayLayout } from '@/lib/layout-mode';
import {
  Check,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  Maximize2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

type StudioTab = 'widgets' | 'layout' | 'presets';
type ResizeAxis = 'x' | 'y' | 'both';

type WidgetMeta = Record<DashboardWidgetId, { label: string; description: string }>;

type DashboardStudioProps = {
  widgets: DashboardWidgetPreference[];
  widgetMeta: WidgetMeta;
  selectedId: DashboardWidgetId | null;
  layoutDraft: RelayLayout;
  onSelect: (id: DashboardWidgetId | null) => void;
  onWidgetsChange: (widgets: DashboardWidgetPreference[]) => void;
  onLayoutChange: (layout: RelayLayout) => void;
  onCancel: () => void;
  onSave: () => void;
  renderWidget: (widget: DashboardWidgetPreference, index: number) => ReactNode;
};

function clone(items: DashboardWidgetPreference[]) {
  return items.map((item) => ({ ...item }));
}

export function DashboardStudio({
  widgets,
  widgetMeta,
  selectedId,
  layoutDraft,
  onSelect,
  onWidgetsChange,
  onLayoutChange,
  onCancel,
  onSave,
  renderWidget,
}: DashboardStudioProps) {
  const [tab, setTab] = useState<StudioTab>('widgets');
  const [query, setQuery] = useState('');
  const [showGrid, setShowGrid] = useState(true);
  const [draggingId, setDraggingId] = useState<DashboardWidgetId | null>(null);
  const [dragOrigin, setDragOrigin] = useState<'canvas' | 'library' | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const widgetsRef = useRef(widgets);
  const resizeRef = useRef<{
    id: DashboardWidgetId;
    axis: ResizeAxis;
    startX: number;
    startY: number;
    startCols: number;
    startRows: number;
  } | null>(null);

  useEffect(() => { widgetsRef.current = widgets; }, [widgets]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const session = resizeRef.current;
      if (!session) return;
      const canvasWidth = canvasRef.current?.clientWidth ?? 960;
      const columnWidth = Math.max(54, canvasWidth / 12);
      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      const colDelta = session.axis === 'y' ? 0 : Math.round(dx / columnWidth);
      const rowDelta = session.axis === 'x' ? 0 : Math.round(dy / 112);
      const next = widgetsRef.current.map((item) => item.id === session.id
        ? resizeDashboardWidget(item, session.startCols + colDelta, session.startRows + rowDelta)
        : item);
      onWidgetsChange(next);
    };
    const up = () => { resizeRef.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [onWidgetsChange]);

  const visibleWidgets = widgets.filter((item) => item.visible);
  const selected = selectedId ? widgets.find((item) => item.id === selectedId) ?? null : null;
  const filteredWidgets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return widgets;
    return widgets.filter((item) => {
      const meta = widgetMeta[item.id];
      return meta.label.toLowerCase().includes(needle) || meta.description.toLowerCase().includes(needle);
    });
  }, [query, widgetMeta, widgets]);

  function selectAndShow(id: DashboardWidgetId) {
    onSelect(id);
    if (!widgets.some((item) => item.id === id && item.visible)) {
      onWidgetsChange(widgets.map((item) => item.id === id ? { ...item, visible: true } : item));
    }
  }

  function toggleVisible(id: DashboardWidgetId) {
    onWidgetsChange(widgets.map((item) => item.id === id ? { ...item, visible: !item.visible } : item));
    if (selectedId === id && widgets.find((item) => item.id === id)?.visible) onSelect(null);
  }

  function startDrag(id: DashboardWidgetId, origin: 'canvas' | 'library') {
    setDraggingId(id);
    setDragOrigin(origin);
    onSelect(id);
  }

  function finishDrag() {
    setDraggingId(null);
    setDragOrigin(null);
  }

  function dropBefore(targetId: DashboardWidgetId) {
    if (!draggingId || draggingId === targetId) return finishDrag();
    const next = clone(widgets);
    const from = next.findIndex((item) => item.id === draggingId);
    const to = next.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return finishDrag();
    const [moved] = next.splice(from, 1);
    if (!moved) return finishDrag();
    moved.visible = true;
    const destination = from < to ? to - 1 : to;
    next.splice(Math.max(0, destination), 0, moved);
    onWidgetsChange(next);
    finishDrag();
  }

  function dropAtEnd() {
    if (!draggingId) return;
    const next = clone(widgets);
    const from = next.findIndex((item) => item.id === draggingId);
    if (from < 0) return finishDrag();
    const [moved] = next.splice(from, 1);
    if (!moved) return finishDrag();
    moved.visible = true;
    next.push(moved);
    onWidgetsChange(next);
    finishDrag();
  }

  function beginResize(event: React.PointerEvent, widget: DashboardWidgetPreference, axis: ResizeAxis) {
    event.preventDefault();
    event.stopPropagation();
    onSelect(widget.id);
    resizeRef.current = {
      id: widget.id,
      axis,
      startX: event.clientX,
      startY: event.clientY,
      startCols: widget.cols,
      startRows: widget.rows,
    };
  }

  function resizeSelected(cols: number, rows: number) {
    if (!selected) return;
    onWidgetsChange(widgets.map((item) => item.id === selected.id ? resizeDashboardWidget(item, cols, rows) : item));
  }

  function applySize(size: Exclude<DashboardWidgetSize, 'custom'>) {
    if (!selected) return;
    onWidgetsChange(widgets.map((item) => item.id === selected.id ? applyDashboardSize(item, size) : item));
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-canvas text-ink">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-canvas/95 px-4 backdrop-blur-xl md:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <LayoutGrid size={18} />
            <h1 className="truncate text-base font-semibold">Dashboard Studio</h1>
            <span className="hidden rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.14em] text-ink-faint sm:inline-flex">Live editor</span>
          </div>
          <p className="mt-0.5 hidden text-xs text-ink-faint md:block">Drag widgets on the canvas. Select one and pull its edges to resize.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => onWidgetsChange(clone(DEFAULT_DASHBOARD_LAYOUT))} className="hidden min-h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-ink-muted hover:text-ink sm:inline-flex"><RotateCcw size={13} />Reset</button>
          <button type="button" onClick={onCancel} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium text-ink-muted hover:text-ink"><X size={14} />Cancel</button>
          <button type="button" onClick={onSave} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-ink px-3.5 text-xs font-semibold text-canvas"><Check size={14} />Save dashboard</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
        <main className="min-h-0 overflow-y-auto bg-surface/35 p-3 md:p-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-ink-faint">Live dashboard</p>
                <p className="mt-1 text-xs text-ink-muted">Everything here is editable. Changes stay drafts until you save.</p>
              </div>
              <button type="button" onClick={() => setShowGrid((value) => !value)} className={`rounded-lg border px-3 py-2 text-xs font-medium ${showGrid ? 'border-ink bg-ink text-canvas' : 'border-border bg-canvas text-ink-muted'}`}>Grid {showGrid ? 'on' : 'off'}</button>
            </div>

            <section className="rounded-2xl border border-border bg-canvas p-3 shadow-sm md:p-5">
              <div className="mb-5 flex items-end justify-between border-b border-border pb-4">
                <div><p className="text-xs text-ink-faint">Dashboard preview</p><p className="mt-1 font-display text-2xl font-medium">Your Relay</p></div>
                <p className="text-xs text-ink-faint">12-column snap grid</p>
              </div>

              <div
                ref={canvasRef}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { if (event.target === event.currentTarget) dropAtEnd(); }}
                className="relative grid min-h-[520px] grid-cols-12 gap-3 rounded-xl p-1"
                style={{
                  gridAutoRows: '100px',
                  backgroundImage: showGrid
                    ? 'linear-gradient(to right, color-mix(in srgb, var(--border) 45%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border) 32%, transparent) 1px, transparent 1px)'
                    : undefined,
                  backgroundSize: showGrid ? 'calc(100% / 12) 100%, 100% 112px' : undefined,
                }}
              >
                {visibleWidgets.map((widget, index) => {
                  const isSelected = selectedId === widget.id;
                  return (
                    <div
                      key={widget.id}
                      onClick={() => onSelect(widget.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => { event.preventDefault(); event.stopPropagation(); dropBefore(widget.id); }}
                      className={`group relative min-h-0 min-w-0 rounded-xl transition-[box-shadow,opacity,transform] ${isSelected ? 'ring-2 ring-ink ring-offset-2 ring-offset-canvas' : 'hover:ring-1 hover:ring-border'} ${draggingId === widget.id ? 'opacity-45' : ''}`}
                      style={{ gridColumn: `span ${widget.cols} / span ${widget.cols}`, gridRow: `span ${widget.rows} / span ${widget.rows}` }}
                    >
                      <div className="h-full min-h-0 overflow-hidden rounded-xl">{renderWidget(widget, index)}</div>
                      <div className={`absolute left-2 top-2 z-20 flex items-center gap-1 rounded-lg border border-border bg-canvas/95 p-1 shadow-sm backdrop-blur ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <div draggable onDragStart={() => startDrag(widget.id, 'canvas')} onDragEnd={finishDrag} title="Drag widget" className="grid h-7 w-7 cursor-grab place-items-center rounded-md text-ink-muted active:cursor-grabbing hover:bg-surface"><GripVertical size={14} /></div>
                        <span className="px-1 text-[10px] font-semibold tabular-nums text-ink-faint">{widget.cols}×{widget.rows}</span>
                      </div>
                      {isSelected && (
                        <>
                          <button type="button" aria-label="Resize widget width" onPointerDown={(event) => beginResize(event, widget, 'x')} className="absolute -right-1.5 top-1/2 z-30 h-16 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-border bg-canvas shadow-sm" />
                          <button type="button" aria-label="Resize widget height" onPointerDown={(event) => beginResize(event, widget, 'y')} className="absolute -bottom-1.5 left-1/2 z-30 h-3 w-16 -translate-x-1/2 cursor-ns-resize rounded-full border border-border bg-canvas shadow-sm" />
                          <button type="button" aria-label="Resize widget" onPointerDown={(event) => beginResize(event, widget, 'both')} className="absolute -bottom-2 -right-2 z-40 grid h-5 w-5 cursor-nwse-resize place-items-center rounded-full border border-ink bg-canvas shadow-md"><Maximize2 size={10} /></button>
                        </>
                      )}
                    </div>
                  );
                })}

                {visibleWidgets.length === 0 && (
                  <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); dropAtEnd(); }} className="col-span-12 row-span-3 grid place-items-center rounded-2xl border border-dashed border-border bg-surface/50 px-6 text-center">
                    <div><p className="font-medium text-ink">Blank canvas</p><p className="mt-1 text-sm text-ink-faint">Show a widget in the library or drag one here.</p></div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>

        <aside className="min-h-0 overflow-y-auto border-t border-border bg-canvas lg:border-l lg:border-t-0">
          <div className="sticky top-0 z-20 border-b border-border bg-canvas/95 p-3 backdrop-blur-xl">
            <div className="grid grid-cols-3 rounded-xl bg-surface p-1">
              {([
                ['widgets', 'Widgets', SlidersHorizontal],
                ['layout', 'Layout', LayoutGrid],
                ['presets', 'Presets', Sparkles],
              ] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" onClick={() => setTab(id)} className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition ${tab === id ? 'bg-canvas text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}><Icon size={13} />{label}</button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {tab === 'widgets' && (
              <div>
                {selected && (
                  <section className="mb-5 rounded-2xl border border-ink/20 bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-ink-faint">Selected widget</p><h2 className="mt-1 font-semibold text-ink">{widgetMeta[selected.id].label}</h2><p className="mt-1 text-xs leading-5 text-ink-faint">{widgetMeta[selected.id].description}</p></div>
                      <span className="rounded-full border border-border bg-canvas px-2 py-1 text-[10px] font-semibold tabular-nums text-ink-muted">{selected.cols}×{selected.rows}</span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => resizeSelected(selected.cols - 1, selected.rows)} className="rounded-lg border border-border bg-canvas px-2 py-2 text-xs font-medium text-ink-muted">− Width</button>
                      <button type="button" onClick={() => resizeSelected(selected.cols + 1, selected.rows)} className="rounded-lg border border-border bg-canvas px-2 py-2 text-xs font-medium text-ink-muted">+ Width</button>
                      <button type="button" onClick={() => resizeSelected(selected.cols, selected.rows - 1)} className="rounded-lg border border-border bg-canvas px-2 py-2 text-xs font-medium text-ink-muted">− Height</button>
                      <button type="button" onClick={() => resizeSelected(selected.cols, selected.rows + 1)} className="rounded-lg border border-border bg-canvas px-2 py-2 text-xs font-medium text-ink-muted">+ Height</button>
                    </div>

                    <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-[.14em] text-ink-faint">Snap size</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.entries(DASHBOARD_SIZE_PRESETS) as Array<[Exclude<DashboardWidgetSize, 'custom'>, { label: string; cols: number; rows: number }]>).map(([size, preset]) => (
                        <button key={size} type="button" onClick={() => applySize(size)} className={`rounded-full border px-2.5 py-1.5 text-[10px] font-medium ${selected.size === size ? 'border-ink bg-ink text-canvas' : 'border-border bg-canvas text-ink-muted hover:text-ink'}`}>{preset.label}</button>
                      ))}
                    </div>
                  </section>
                )}

                <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
                  <Search size={14} className="text-ink-faint" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a widget…" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" />
                </label>
                <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-[.14em] text-ink-faint">Widget Library</p>
                <div className="space-y-2">
                  {filteredWidgets.map((widget) => {
                    const meta = widgetMeta[widget.id];
                    const active = selectedId === widget.id;
                    return (
                      <div key={widget.id} onClick={() => onSelect(widget.id)} className={`flex items-center gap-2 rounded-xl border p-2.5 transition ${active ? 'border-ink bg-surface' : 'border-border bg-canvas hover:bg-surface'}`}>
                        <div draggable onDragStart={() => startDrag(widget.id, 'library')} onDragEnd={finishDrag} title="Drag onto dashboard" className="grid h-9 w-8 shrink-0 cursor-grab place-items-center rounded-lg text-ink-faint hover:bg-surface-raised active:cursor-grabbing"><GripVertical size={15} /></div>
                        <button type="button" onClick={(event) => { event.stopPropagation(); selectAndShow(widget.id); }} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-medium text-ink">{meta.label}</p><p className="mt-0.5 truncate text-[11px] text-ink-faint">{meta.description}</p></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); toggleVisible(widget.id); }} aria-label={`${widget.visible ? 'Hide' : 'Show'} ${meta.label}`} className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${widget.visible ? 'border-ink bg-ink text-canvas' : 'border-border text-ink-muted hover:bg-surface'}`}>{widget.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                      </div>
                    );
                  })}
                </div>
                {dragOrigin === 'library' && draggingId && <p className="mt-3 rounded-xl border border-dashed border-border bg-surface p-3 text-center text-xs text-ink-faint">Drop it anywhere on the dashboard canvas.</p>}
              </div>
            )}

            {tab === 'layout' && (
              <div>
                <div className="mb-4 rounded-2xl border border-border bg-surface p-4"><h2 className="text-sm font-semibold text-ink">Canvas layout</h2><p className="mt-1 text-xs leading-5 text-ink-faint">The Studio uses a 12-column grid. Drag a widget’s right edge for width, bottom edge for height, or the corner for both.</p></div>
                <LayoutControls value={layoutDraft} onChange={onLayoutChange} />
                <button type="button" onClick={() => setShowGrid((value) => !value)} className="mt-3 w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm font-medium text-ink">{showGrid ? 'Hide' : 'Show'} snap grid</button>
              </div>
            )}

            {tab === 'presets' && (
              <div>
                <div className="mb-4"><h2 className="text-sm font-semibold text-ink">Starting layouts</h2><p className="mt-1 text-xs leading-5 text-ink-faint">Presets update the live canvas immediately. Nothing is permanent until Save dashboard.</p></div>
                <div className="space-y-2">
                  {DASHBOARD_PRESETS.map((preset) => (
                    <button key={preset.id} type="button" onClick={() => { onWidgetsChange(applyDashboardPreset(widgets, preset.id)); onSelect(null); }} className="w-full rounded-2xl border border-border bg-canvas p-4 text-left transition hover:bg-surface"><div className="flex items-center justify-between gap-3"><span className="font-medium text-ink">{preset.name}</span><Sparkles size={14} className="text-ink-faint" /></div><p className="mt-1 text-xs leading-5 text-ink-faint">{preset.description}</p></button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
