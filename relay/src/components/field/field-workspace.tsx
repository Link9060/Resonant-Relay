'use client';

import {
  loadFieldGraph,
  loadFieldNodeBundle,
  uploadFieldFile,
  type RelayFieldBundle,
  type RelayFieldEdge,
  type RelayFieldNode,
} from '@/lib/field/client';
import { appPageUrl } from '@/lib/config';
import {
  Brain,
  CalendarDays,
  ChevronRight,
  File,
  FolderKanban,
  ListFilter,
  ListTodo,
  Loader2,
  Network,
  RefreshCw,
  Search,
  StickyNote,
  Upload,
  X,
} from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

const TYPE_META: Record<string, { label: string; color: string; icon: typeof File }> = {
  collection: { label: 'Collections', color: '#f1f1f3', icon: Network },
  project: { label: 'Projects', color: '#d8d8dc', icon: FolderKanban },
  note: { label: 'Notes', color: '#bdbdc4', icon: StickyNote },
  file: { label: 'Files', color: '#aeb2bb', icon: File },
  todo: { label: 'To Do', color: '#c8c4bb', icon: ListTodo },
  calendar_event: { label: 'Calendar', color: '#b7c1bc', icon: CalendarDays },
  ravin_conversation: { label: 'RAVIN', color: '#c7becd', icon: Brain },
  memory: { label: 'Memory', color: '#bfb8c0', icon: Brain },
  chat: { label: 'Chats', color: '#aeb1b7', icon: Network },
  other: { label: 'Other', color: '#9a9aa1', icon: File },
};

const GROUP_CENTERS: Record<string, { x: number; y: number }> = {
  collection: { x: 500, y: 350 },
  project: { x: 500, y: 440 },
  note: { x: 255, y: 205 },
  file: { x: 245, y: 520 },
  todo: { x: 770, y: 205 },
  calendar_event: { x: 790, y: 510 },
  ravin_conversation: { x: 515, y: 130 },
  memory: { x: 520, y: 585 },
  chat: { x: 655, y: 350 },
  other: { x: 500, y: 350 },
};

export function FieldWorkspace() {
  const [nodes, setNodes] = useState<RelayFieldNode[]>([]);
  const [edges, setEdges] = useState<RelayFieldEdge[]>([]);
  const [selected, setSelected] = useState<RelayFieldNode | null>(null);
  const [bundle, setBundle] = useState<RelayFieldBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedIdRef = useRef<string | null>(null);

  async function refresh(preferredId?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const graph = await loadFieldGraph();
      setNodes(graph.nodes);
      setEdges(graph.edges);
      const nextSelected = preferredId
        ? graph.nodes.find((node) => node.id === preferredId) ?? null
        : selected && graph.nodes.find((node) => node.id === selected.id) || null;
      if (nextSelected) void chooseNode(nextSelected);
    } catch (loadError) {
      console.error('Field graph load failed', loadError);
      setError('Relay could not load your Field right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void refresh(); });
    const onSemanticUpdate = () => { void refresh(selectedIdRef.current); };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape' && selectedIdRef.current) {
        selectedIdRef.current = null;
        setSelected(null);
        setBundle(null);
      }
    };

    window.addEventListener('relay-field-semantic-updated', onSemanticUpdate);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('relay-field-semantic-updated', onSemanticUpdate);
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function chooseNode(node: RelayFieldNode) {
    selectedIdRef.current = node.id;
    setSelected(node);
    setBundle(null);
    setBundleLoading(true);
    try {
      setBundle(await loadFieldNodeBundle(node));
    } catch (loadError) {
      console.error('Field node content load failed', loadError);
      setError('This Field node loaded, but its content preview did not.');
    } finally {
      setBundleLoading(false);
    }
  }

  function closeInspector() {
    selectedIdRef.current = null;
    setSelected(null);
    setBundle(null);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const node = await uploadFieldFile(file);
      await refresh(node.id);
    } catch (uploadError) {
      console.error('Field upload failed', uploadError);
      setError(uploadError instanceof Error ? uploadError.message : 'That file could not be added to Field.');
    } finally {
      setUploading(false);
    }
  }

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    return counts;
  }, [nodes]);

  const visibleNodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return nodes.filter((node) => {
      if (typeFilter !== 'all' && node.type !== typeFilter) return false;
      if (!needle) return true;
      return `${node.title} ${node.searchable_text ?? ''} ${node.source_type}`.toLowerCase().includes(needle);
    });
  }, [nodes, query, typeFilter]);

  const positions = useMemo(() => layoutNodes(visibleNodes), [visibleNodes]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => edges.filter((edge) => visibleIds.has(edge.source_node_id) && visibleIds.has(edge.target_node_id)),
    [edges, visibleIds],
  );
  const semanticEdgeCount = useMemo(
    () => visibleEdges.filter((edge) => edge.relation_type === 'semantic_related').length,
    [visibleEdges],
  );

  return (
    <section className="relative flex h-[calc(100vh-65px)] min-h-[640px] w-full flex-col overflow-hidden bg-canvas dark:bg-black">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-canvas px-5 dark:bg-black md:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-ink">
            <Network size={15} strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Field</h1>
              <span className="hidden text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint sm:inline">Knowledge</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-ink-faint">
              {loading ? 'Syncing knowledge…' : `${visibleNodes.length} nodes · ${visibleEdges.length} links`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="mr-2 hidden items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-ink-faint md:flex">
            <i className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
            Live
          </span>
          <input ref={fileInputRef} type="file" className="hidden" onChange={upload} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[11px] font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span className="hidden sm:inline">{uploading ? 'Adding…' : 'Add file'}</span>
          </button>
          <button
            type="button"
            onClick={() => void refresh(selected?.id)}
            disabled={loading}
            aria-label="Refresh Field"
            title="Refresh Field"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {error && (
        <div className="absolute left-1/2 top-[76px] z-40 -translate-x-1/2 rounded-lg border border-red-500/15 bg-canvas/95 px-3 py-2 text-xs text-red-500 shadow-lg backdrop-blur">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[196px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r border-border bg-surface/35 dark:bg-[#080809] md:flex md:flex-col">
          <div className="p-3">
            <label className="relative block">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Field"
                className="w-full rounded-lg border border-border bg-canvas/70 py-2.5 pl-8 pr-10 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-ink-faint"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[8px] text-ink-faint">⌘K</span>
            </label>
          </div>

          <div className="px-2 pb-3">
            <div className="px-2 pb-2 pt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">View</div>
            <FilterButton
              active={typeFilter === 'all'}
              label="Everything"
              count={nodes.length}
              icon={ListFilter}
              onClick={() => setTypeFilter('all')}
            />
            {Object.entries(TYPE_META).map(([type, meta]) => {
              const count = typeCounts.get(type) ?? 0;
              if (!count) return null;
              return (
                <FilterButton
                  key={type}
                  active={typeFilter === type}
                  label={meta.label}
                  count={count}
                  icon={meta.icon}
                  onClick={() => setTypeFilter(type)}
                />
              );
            })}
          </div>

          <div className="mt-auto border-t border-border px-4 py-4">
            <div className="flex items-center justify-between text-[10px] text-ink-faint">
              <span>Semantic links</span>
              <span className="font-medium text-ink-muted">{semanticEdgeCount}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[9px] text-ink-faint">
              <span className="block h-px w-6 bg-ink-faint/50" />
              Structure
            </div>
            <div className="mt-2 flex items-center gap-2 text-[9px] text-ink-faint">
              <svg width="24" height="4" aria-hidden="true"><line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeDasharray="3 4" opacity=".65" /></svg>
              Meaning
            </div>
          </div>
        </aside>

        <main className="relative min-h-0 overflow-hidden bg-canvas dark:bg-black">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 md:px-5">
            <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-border bg-canvas/80 p-1 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(.62, value - .12))}
                className="h-7 w-7 rounded-md text-[13px] text-ink-faint hover:bg-surface hover:text-ink"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="min-w-10 text-center text-[9px] tabular-nums text-ink-faint">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.min(1.8, value + .12))}
                className="h-7 w-7 rounded-md text-[13px] text-ink-faint hover:bg-surface hover:text-ink"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>

            <div className="pointer-events-auto md:hidden">
              <button
                type="button"
                onClick={() => searchRef.current?.focus()}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-canvas/80 text-ink-faint backdrop-blur-xl"
                aria-label="Search Field"
              >
                <Search size={14} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-border text-ink-muted">
                  <Loader2 size={17} className="animate-spin" />
                </span>
                <p className="mt-3 text-[11px] text-ink-faint">Building your Field</p>
              </div>
            </div>
          ) : visibleNodes.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div className="max-w-64">
                <Network size={24} className="mx-auto text-ink-faint" strokeWidth={1.4} />
                <p className="mt-3 text-sm font-medium text-ink">Nothing here yet</p>
                <p className="mt-1 text-xs leading-5 text-ink-faint">Try another filter or add a file to your Field.</p>
              </div>
            </div>
          ) : (
            <svg viewBox="0 0 1000 700" className="h-full w-full select-none" role="img" aria-label="Field knowledge graph">
              <defs>
                <radialGradient id="field-node-halo">
                  <stop offset="0%" stopColor="currentColor" stopOpacity=".18" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
                <pattern id="field-dot-grid" width="34" height="34" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r=".65" fill="currentColor" opacity=".055" />
                </pattern>
              </defs>
              <rect width="1000" height="700" fill="url(#field-dot-grid)" />

              <g transform={`translate(${500 - 500 * zoom} ${350 - 350 * zoom}) scale(${zoom})`}>
                {visibleEdges.map((edge) => {
                  const a = positions.get(edge.source_node_id);
                  const b = positions.get(edge.target_node_id);
                  if (!a || !b) return null;
                  const semantic = edge.relation_type === 'semantic_related';
                  const highlighted = selected && (edge.source_node_id === selected.id || edge.target_node_id === selected.id);
                  return (
                    <line
                      key={edge.id}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="currentColor"
                      strokeOpacity={highlighted ? .42 : semantic ? Math.max(.07, edge.strength * .15) : Math.max(.055, edge.strength * .12)}
                      strokeWidth={highlighted ? 1.4 : semantic ? .82 : .7}
                      strokeDasharray={semantic ? '3.5 5' : undefined}
                    />
                  );
                })}

                {visibleNodes.map((node) => {
                  const position = positions.get(node.id)!;
                  const meta = TYPE_META[node.type] ?? TYPE_META.other!;
                  const isSelected = selected?.id === node.id;
                  const isHub = node.type === 'collection' || node.type === 'project';
                  const radius = isSelected ? 8 : node.type === 'collection' ? 7.2 : node.type === 'project' ? 6.2 : 4.6;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${position.x} ${position.y})`}
                      role="button"
                      tabIndex={0}
                      aria-label={node.title}
                      className="cursor-pointer outline-none"
                      onClick={() => void chooseNode(node)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          void chooseNode(node);
                        }
                      }}
                    >
                      {(isSelected || isHub) && (
                        <circle
                          r={isSelected ? 31 : node.type === 'collection' ? 25 : 20}
                          fill={meta.color}
                          opacity={isSelected ? .09 : .035}
                        />
                      )}
                      <circle r={radius + 4} fill="none" stroke={meta.color} strokeOpacity={isSelected ? .42 : isHub ? .16 : .08} />
                      <circle r={radius} fill={isSelected ? '#f6f6f7' : meta.color} opacity={isSelected ? 1 : isHub ? .9 : .72} />
                      {(isSelected || isHub) && (
                        <text
                          y={node.type === 'collection' ? 20 : 18}
                          textAnchor="middle"
                          fontSize={isSelected ? 10 : node.type === 'collection' ? 9.2 : 8.5}
                          fill="currentColor"
                          opacity={isSelected ? .95 : .56}
                        >
                          {truncate(node.title, 28)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-end justify-between text-[9px] text-ink-faint md:left-5">
            <span>Click a node to inspect · Esc to close</span>
            <span className="hidden sm:inline">Field · Resonant Assist</span>
          </div>

          {selected && (
            <aside className="absolute inset-y-0 right-0 z-30 w-[360px] max-w-[88vw] border-l border-border bg-canvas/95 shadow-[-24px_0_60px_rgba(0,0,0,0.18)] backdrop-blur-2xl dark:bg-black/95">
              <NodeInspector node={selected} bundle={bundle} loading={bundleLoading} onClose={closeInspector} />
            </aside>
          )}
        </main>
      </div>
    </section>
  );
}

function NodeInspector({
  node,
  bundle,
  loading,
  onClose,
}: {
  node: RelayFieldNode;
  bundle: RelayFieldBundle | null;
  loading: boolean;
  onClose: () => void;
}) {
  const meta = TYPE_META[node.type] ?? TYPE_META.other!;
  const sourceHref = sourcePage(node.source_type);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{meta.label}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-surface hover:text-ink"
          aria-label="Close inspector"
        >
          <X size={15} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <h2 className="font-display text-[24px] font-medium leading-[1.08] tracking-[-0.035em] text-ink">{node.title}</h2>
        <p className="mt-2 text-[11px] text-ink-faint">{node.source_product} · {node.source_type}</p>

        <div className="mt-6">
          <InspectorLabel>Preview</InspectorLabel>
          {loading ? (
            <div className="mt-3 flex items-center gap-2 py-5 text-xs text-ink-faint">
              <Loader2 size={14} className="animate-spin" />
              Loading content…
            </div>
          ) : (
            <ContentPreview node={node} bundle={bundle} />
          )}
        </div>

        <div className="mt-7 border-t border-border pt-5">
          <InspectorLabel>Details</InspectorLabel>
          <dl className="mt-3 divide-y divide-border">
            <Meta label="Source" value={node.source_product} />
            <Meta label="Type" value={node.source_type} />
            <Meta label="Updated" value={formatDate(node.updated_at)} />
            <Meta label="Node" value={node.id.slice(0, 8)} />
          </dl>
        </div>
      </div>

      {sourceHref && (
        <div className="shrink-0 border-t border-border p-3">
          <a
            href={appPageUrl(sourceHref)}
            className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-xs font-medium text-ink-muted hover:bg-surface hover:text-ink"
          >
            <span>Open in Relay</span>
            <ChevronRight size={14} />
          </a>
        </div>
      )}
    </div>
  );
}

function ContentPreview({ node, bundle }: { node: RelayFieldNode; bundle: RelayFieldBundle | null }) {
  const content = bundle?.content ?? null;
  const file = bundle?.file ?? null;

  if (bundle?.previewUrl && String(content?.content_kind ?? '').toLowerCase() === 'image') {
    return (
      <figure className="mt-3 overflow-hidden rounded-lg border border-border bg-surface/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bundle.previewUrl} alt={content?.preview_alt ?? node.title} className="max-h-80 w-full object-contain" />
        <figcaption className="border-t border-border px-3 py-2 text-[9px] text-ink-faint">{file?.file_name ?? node.title}</figcaption>
      </figure>
    );
  }

  if (bundle?.previewUrl && String(file?.mime_type ?? '').toLowerCase() === 'application/pdf') {
    return (
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface/40">
        <iframe src={bundle.previewUrl} title={file?.file_name ?? node.title} className="h-80 w-full border-0 bg-white" />
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-[9px] text-ink-faint">
          <span className="truncate">{file?.file_name ?? node.title}</span>
          <a href={bundle.previewUrl} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-ink-muted hover:text-ink">Open PDF</a>
        </div>
      </div>
    );
  }

  if (content?.content_kind === 'note_blocks' && Array.isArray(content.structured_content)) {
    return (
      <div className="mt-3 max-h-[440px] overflow-y-auto border-l border-border pl-4 pr-1">
        <div className="space-y-2.5">
          {content.structured_content.map((block: any, index: number) => {
            const text = String(block?.text ?? '');
            if (block?.type === 'heading') return <h3 key={block.id ?? index} className="font-display text-[17px] font-medium tracking-[-0.02em] text-ink">{text}</h3>;
            if (block?.type === 'bullet') return <p key={block.id ?? index} className="flex gap-2 text-[12px] leading-6 text-ink-muted"><span className="text-ink-faint">•</span><span>{text}</span></p>;
            if (block?.type === 'quote') return <blockquote key={block.id ?? index} className="border-l border-ink-faint/50 pl-3 text-[12px] italic leading-6 text-ink-muted">{text}</blockquote>;
            if (block?.type === 'todo') return <p key={block.id ?? index} className={`flex gap-2 text-[12px] leading-6 ${block?.checked ? 'text-ink-faint line-through' : 'text-ink-muted'}`}><span>{block?.checked ? '✓' : '○'}</span><span>{text}</span></p>;
            return <p key={block.id ?? index} className="whitespace-pre-wrap text-[12px] leading-6 text-ink-muted">{text}</p>;
          })}
        </div>
      </div>
    );
  }

  if (content?.content_kind === 'todo') {
    const value = content.structured_content ?? {};
    return (
      <div className="mt-3 flex gap-3 border-l border-border py-1 pl-4">
        <span className="pt-0.5 text-sm text-ink-faint">{value.completed ? '✓' : '○'}</span>
        <div>
          <div className={`text-[13px] font-medium ${value.completed ? 'text-ink-faint line-through' : 'text-ink'}`}>{value.title ?? node.title}</div>
          <div className="mt-1 text-[10px] text-ink-faint">Due {value.due_on ?? 'unscheduled'}</div>
        </div>
      </div>
    );
  }

  if (content?.content_kind === 'calendar_event') {
    const value = content.structured_content ?? {};
    return (
      <div className="mt-3 border-l border-border pl-4">
        <div className="text-[12px] font-medium text-ink">{value.event_date ?? 'Calendar event'}</div>
        {!value.is_all_day && <div className="mt-1 text-[10px] text-ink-faint">{String(value.start_time ?? '').slice(0, 5)}{value.end_time ? `–${String(value.end_time).slice(0, 5)}` : ''}</div>}
        {value.details && <p className="mt-3 whitespace-pre-wrap text-[12px] leading-6 text-ink-muted">{value.details}</p>}
      </div>
    );
  }

  if (content?.text_content) {
    return <div className="mt-3 max-h-[440px] overflow-y-auto whitespace-pre-wrap border-l border-border pl-4 pr-1 text-[12px] leading-6 text-ink-muted">{content.text_content}</div>;
  }

  if (file) {
    return (
      <div className="mt-3 flex items-center gap-3 border-l border-border py-1 pl-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-ink-faint">
          <File size={15} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-medium text-ink">{file.file_name}</div>
          <div className="mt-1 text-[9px] text-ink-faint">{file.mime_type || 'File'} · {formatBytes(file.size_bytes)}</div>
          {file.extraction_status === 'pending' && <div className="mt-1 text-[9px] text-ink-faint">Preview extraction pending</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border-l border-border pl-4 text-[12px] leading-6 text-ink-muted">
      {node.searchable_text || 'This node does not have a richer preview yet.'}
    </div>
  );
}

function InspectorLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">{children}</div>;
}

function FilterButton({
  active,
  label,
  count,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  icon: typeof File;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors ${active ? 'bg-surface text-ink' : 'text-ink-faint hover:bg-surface/70 hover:text-ink-muted'}`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon size={13} strokeWidth={1.7} className={active ? 'text-ink-muted' : 'text-ink-faint'} />
        <span className="truncate">{label}</span>
      </span>
      <span className="ml-2 text-[9px] tabular-nums text-ink-faint">{count}</span>
    </button>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-[10px] text-ink-faint">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[10px] font-medium text-ink-muted">{value}</dd>
    </div>
  );
}

function layoutNodes(nodes: RelayFieldNode[]) {
  const groups = new Map<string, RelayFieldNode[]>();
  for (const node of nodes) {
    const type = GROUP_CENTERS[node.type] ? node.type : 'other';
    groups.set(type, [...(groups.get(type) ?? []), node]);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [type, group] of groups) {
    const center = GROUP_CENTERS[type] ?? GROUP_CENTERS.other!;
    group.forEach((node, index) => {
      if (group.length === 1) {
        positions.set(node.id, center);
        return;
      }
      const turn = index * 2.399963229728653;
      const radius = 18 + Math.sqrt(index + 1) * 15;
      positions.set(node.id, {
        x: center.x + Math.cos(turn) * radius,
        y: center.y + Math.sin(turn) * radius,
      });
    });
  }
  return positions;
}

function sourcePage(sourceType: string) {
  if (sourceType === 'note') return '/notes';
  if (sourceType === 'todo') return '/todo';
  if (sourceType === 'calendar_event') return '/calendar';
  return null;
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
