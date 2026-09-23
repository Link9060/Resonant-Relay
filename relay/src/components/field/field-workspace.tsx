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
  File,
  FolderKanban,
  Image as ImageIcon,
  ListTodo,
  Loader2,
  Network,
  RefreshCw,
  Search,
  StickyNote,
  Upload,
} from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

const TYPE_META: Record<string, { label: string; color: string; icon: typeof File }> = {
  project: { label: 'Projects', color: '#f3f3f5', icon: FolderKanban },
  note: { label: 'Notes', color: '#9f8cff', icon: StickyNote },
  file: { label: 'Files', color: '#70b7ff', icon: File },
  todo: { label: 'Todos', color: '#ffb86b', icon: ListTodo },
  calendar_event: { label: 'Calendar', color: '#70e1b5', icon: CalendarDays },
  ravin_conversation: { label: 'RAVIN', color: '#d08cff', icon: Brain },
  memory: { label: 'Memory', color: '#f28fb5', icon: Brain },
  chat: { label: 'Chats', color: '#8f98a8', icon: Network },
  other: { label: 'Other', color: '#92929c', icon: File },
};

const GROUP_CENTERS: Record<string, { x: number; y: number }> = {
  project: { x: 500, y: 350 },
  note: { x: 245, y: 205 },
  file: { x: 230, y: 505 },
  todo: { x: 780, y: 200 },
  calendar_event: { x: 805, y: 500 },
  ravin_conversation: { x: 500, y: 125 },
  memory: { x: 520, y: 575 },
  chat: { x: 650, y: 340 },
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
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function chooseNode(node: RelayFieldNode) {
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

  return (
    <section className="mx-auto max-w-[1500px] px-4 py-6 md:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Network size={20} className="text-ink-muted" />
            <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Field</h1>
          </div>
          <p className="mt-1 text-sm text-ink-faint">Your Relay notes, tasks, events, files, and future RAVIN context in one connected knowledge layer.</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={upload} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-raised disabled:opacity-50"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'Adding…' : 'Add file'}
          </button>
          <button
            type="button"
            onClick={() => void refresh(selected?.id)}
            disabled={loading}
            aria-label="Refresh Field"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-ink-muted hover:bg-surface-raised hover:text-ink disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-500/15 bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid min-h-[680px] overflow-hidden rounded-2xl border border-border bg-surface xl:grid-cols-[220px_minmax(0,1fr)_340px]">
        <aside className="border-b border-border bg-surface-raised p-3 xl:border-b-0 xl:border-r">
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Field"
              className="w-full rounded-lg border border-border bg-canvas py-2.5 pl-8 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted"
            />
          </label>

          <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Show</div>
          <div className="mt-2 grid gap-1">
            <FilterButton active={typeFilter === 'all'} label="Everything" count={nodes.length} onClick={() => setTypeFilter('all')} />
            {Object.entries(TYPE_META).map(([type, meta]) => {
              const count = typeCounts.get(type) ?? 0;
              if (!count) return null;
              return (
                <FilterButton
                  key={type}
                  active={typeFilter === type}
                  label={meta.label}
                  count={count}
                  color={meta.color}
                  onClick={() => setTypeFilter(type)}
                />
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <Stat value={visibleNodes.length} label="Nodes" />
            <Stat value={visibleEdges.length} label="Links" />
            <Stat value={typeCounts.size} label="Types" />
          </div>

          <div className="mt-5 rounded-xl border border-border bg-canvas p-3 text-xs leading-5 text-ink-faint">
            <strong className="block text-ink">Live Field data</strong>
            Notes and todos sync automatically through Supabase triggers. Uploaded images/files become private Field nodes.
          </div>
        </aside>

        <div className="relative min-h-[520px] overflow-hidden bg-canvas">
          <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-lg border border-border bg-surface/90 p-1 backdrop-blur">
            <button type="button" onClick={() => setZoom((value) => Math.max(.65, value - .12))} className="h-8 w-8 rounded-md text-sm text-ink-muted hover:bg-surface-raised">−</button>
            <span className="min-w-12 text-center text-[10px] text-ink-faint">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(1.8, value + .12))} className="h-8 w-8 rounded-md text-sm text-ink-muted hover:bg-surface-raised">+</button>
          </div>

          {loading ? (
            <div className="flex min-h-[520px] items-center justify-center gap-2 text-sm text-ink-faint"><Loader2 size={16} className="animate-spin" />Loading your Field…</div>
          ) : visibleNodes.length === 0 ? (
            <div className="flex min-h-[520px] items-center justify-center px-6 text-center">
              <div>
                <Network size={26} className="mx-auto text-ink-faint" />
                <p className="mt-3 text-sm font-medium text-ink">No matching nodes</p>
                <p className="mt-1 text-xs text-ink-faint">Try another search/filter or add a file.</p>
              </div>
            </div>
          ) : (
            <svg viewBox="0 0 1000 700" className="h-full min-h-[680px] w-full select-none" role="img" aria-label="Field knowledge graph">
              <defs>
                <radialGradient id="field-glow">
                  <stop offset="0%" stopColor="currentColor" stopOpacity=".28" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g transform={`translate(${500 - 500 * zoom} ${350 - 350 * zoom}) scale(${zoom})`}>
                {Object.entries(GROUP_CENTERS).map(([type, center]) => {
                  if (!(typeCounts.get(type) ?? 0) || (typeFilter !== 'all' && typeFilter !== type)) return null;
                  return (
                    <text key={type} x={center.x} y={center.y - 82} textAnchor="middle" fontSize="10" fill="currentColor" opacity=".28">
                      {TYPE_META[type]?.label.toUpperCase() ?? type.toUpperCase()}
                    </text>
                  );
                })}

                {visibleEdges.map((edge) => {
                  const a = positions.get(edge.source_node_id);
                  const b = positions.get(edge.target_node_id);
                  if (!a || !b) return null;
                  const highlighted = selected && (edge.source_node_id === selected.id || edge.target_node_id === selected.id);
                  return (
                    <line
                      key={edge.id}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="currentColor"
                      strokeOpacity={highlighted ? .35 : Math.max(.06, edge.strength * .14)}
                      strokeWidth={highlighted ? 1.5 : .75}
                    />
                  );
                })}

                {visibleNodes.map((node) => {
                  const position = positions.get(node.id)!;
                  const meta = TYPE_META[node.type] ?? TYPE_META.other;
                  const isSelected = selected?.id === node.id;
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
                      {(isSelected || node.type === 'project') && <circle r={isSelected ? 30 : 23} fill={meta.color} opacity={isSelected ? .11 : .055} />}
                      <circle r={isSelected ? 8 : node.type === 'project' ? 7 : 5.25} fill={isSelected ? '#ffffff' : meta.color} />
                      <circle r={isSelected ? 12 : node.type === 'project' ? 10 : 8} fill="none" stroke={meta.color} strokeOpacity={isSelected ? .5 : .16} />
                      {(isSelected || node.type === 'project') && (
                        <text y={18} textAnchor="middle" fontSize={isSelected ? 10 : 8.5} fill="currentColor" opacity={isSelected ? .9 : .62}>
                          {truncate(node.title, 28)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
        </div>

        <aside className="border-t border-border bg-surface-raised p-4 xl:border-l xl:border-t-0">
          {!selected ? (
            <div className="flex min-h-72 h-full items-center justify-center text-center">
              <div className="max-w-56">
                <Network size={25} className="mx-auto text-ink-faint" />
                <p className="mt-3 text-sm font-medium text-ink">Pick a node</p>
                <p className="mt-1 text-xs leading-5 text-ink-faint">Open a node to see the actual note, task details, or private image/file preview.</p>
              </div>
            </div>
          ) : (
            <NodeInspector node={selected} bundle={bundle} loading={bundleLoading} />
          )}
        </aside>
      </div>
    </section>
  );
}

function NodeInspector({ node, bundle, loading }: { node: RelayFieldNode; bundle: RelayFieldBundle | null; loading: boolean }) {
  const meta = TYPE_META[node.type] ?? TYPE_META.other;
  const Icon = meta.icon;
  const sourceHref = sourcePage(node.source_type);

  return (
    <div>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
        {meta.label}
      </div>
      <h2 className="mt-3 font-display text-2xl font-medium tracking-tight text-ink">{node.title}</h2>
      <p className="mt-2 text-xs leading-5 text-ink-faint">{node.source_product} · {node.source_type}</p>

      <div className="mt-5 border-t border-border pt-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Content preview</div>
        {loading ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-canvas p-4 text-xs text-ink-faint"><Loader2 size={14} className="animate-spin" />Loading node content…</div>
        ) : (
          <ContentPreview node={node} bundle={bundle} Icon={Icon} />
        )}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Metadata</div>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <Meta label="Source" value={node.source_product} />
          <Meta label="Type" value={node.source_type} />
          <Meta label="Updated" value={formatDate(node.updated_at)} />
          <Meta label="Node" value={node.id.slice(0, 8)} />
        </dl>
      </div>

      {sourceHref && (
        <a href={appPageUrl(sourceHref)} className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-border text-xs font-medium text-ink hover:bg-surface">
          Open source in Relay
        </a>
      )}
    </div>
  );
}

function ContentPreview({ node, bundle, Icon }: { node: RelayFieldNode; bundle: RelayFieldBundle | null; Icon: typeof File }) {
  const content = bundle?.content ?? null;
  const file = bundle?.file ?? null;

  if (bundle?.previewUrl && String(content?.content_kind ?? '').toLowerCase() === 'image') {
    return (
      <figure className="mt-3 overflow-hidden rounded-xl border border-border bg-canvas">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bundle.previewUrl} alt={content?.preview_alt ?? node.title} className="max-h-80 w-full object-contain" />
        <figcaption className="border-t border-border px-3 py-2 text-[10px] text-ink-faint">{file?.file_name ?? node.title}</figcaption>
      </figure>
    );
  }

  if (content?.content_kind === 'note_blocks' && Array.isArray(content.structured_content)) {
    return (
      <div className="mt-3 max-h-[420px] overflow-y-auto rounded-xl border border-border bg-canvas p-4">
        <div className="space-y-2">
          {content.structured_content.map((block: any, index: number) => {
            const text = String(block?.text ?? '');
            if (block?.type === 'heading') return <h3 key={block.id ?? index} className="font-display text-lg font-semibold text-ink">{text}</h3>;
            if (block?.type === 'bullet') return <p key={block.id ?? index} className="flex gap-2 text-sm leading-6 text-ink-muted"><span>•</span><span>{text}</span></p>;
            if (block?.type === 'quote') return <blockquote key={block.id ?? index} className="border-l-2 border-ink-faint pl-3 text-sm italic leading-6 text-ink-muted">{text}</blockquote>;
            if (block?.type === 'todo') return <p key={block.id ?? index} className={`flex gap-2 text-sm leading-6 ${block?.checked ? 'text-ink-faint line-through' : 'text-ink'}`}><span>{block?.checked ? '☑' : '☐'}</span><span>{text}</span></p>;
            return <p key={block.id ?? index} className="whitespace-pre-wrap text-sm leading-6 text-ink">{text}</p>;
          })}
        </div>
      </div>
    );
  }

  if (content?.content_kind === 'todo') {
    const value = content.structured_content ?? {};
    return (
      <div className="mt-3 flex gap-3 rounded-xl border border-border bg-canvas p-4">
        <span className="text-lg">{value.completed ? '☑' : '☐'}</span>
        <div>
          <div className={`text-sm font-medium ${value.completed ? 'text-ink-faint line-through' : 'text-ink'}`}>{value.title ?? node.title}</div>
          <div className="mt-1 text-xs text-ink-faint">Due {value.due_on ?? 'unscheduled'}</div>
        </div>
      </div>
    );
  }

  if (content?.content_kind === 'calendar_event') {
    const value = content.structured_content ?? {};
    return (
      <div className="mt-3 rounded-xl border border-border bg-canvas p-4">
        <div className="text-sm font-medium text-ink">{value.event_date ?? 'Calendar event'}</div>
        {!value.is_all_day && <div className="mt-1 text-xs text-ink-faint">{String(value.start_time ?? '').slice(0, 5)}{value.end_time ? `–${String(value.end_time).slice(0, 5)}` : ''}</div>}
        {value.details && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{value.details}</p>}
      </div>
    );
  }

  if (content?.text_content) {
    return <div className="mt-3 max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-canvas p-4 text-sm leading-6 text-ink-muted">{content.text_content}</div>;
  }

  if (file) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-canvas p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface"><Icon size={18} className="text-ink-muted" /></span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">{file.file_name}</div>
          <div className="mt-1 text-xs text-ink-faint">{file.mime_type || 'File'} · {formatBytes(file.size_bytes)}</div>
          {file.extraction_status === 'pending' && <div className="mt-1 text-[10px] text-ink-faint">Text preview extraction is pending.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-canvas p-4 text-sm leading-6 text-ink-muted">
      {node.searchable_text || 'This node does not have a richer preview yet.'}
    </div>
  );
}

function FilterButton({ active, label, count, color, onClick }: { active: boolean; label: string; count: number; color?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${active ? 'bg-canvas text-ink' : 'text-ink-muted hover:bg-surface'}`}>
      <span className="flex items-center gap-2">{color && <i className="h-2 w-2 rounded-full" style={{ background: color }} />}{label}</span>
      <span className="text-[10px] text-ink-faint">{count}</span>
    </button>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div><div className="text-lg font-medium text-ink">{value}</div><div className="text-[9px] uppercase tracking-[0.12em] text-ink-faint">{label}</div></div>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-canvas p-2.5"><dt className="text-[9px] uppercase tracking-[0.1em] text-ink-faint">{label}</dt><dd className="mt-1 truncate text-xs font-medium text-ink-muted">{value}</dd></div>;
}

function layoutNodes(nodes: RelayFieldNode[]) {
  const groups = new Map<string, RelayFieldNode[]>();
  for (const node of nodes) {
    const type = GROUP_CENTERS[node.type] ? node.type : 'other';
    groups.set(type, [...(groups.get(type) ?? []), node]);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [type, group] of groups) {
    const center = GROUP_CENTERS[type] ?? GROUP_CENTERS.other;
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
