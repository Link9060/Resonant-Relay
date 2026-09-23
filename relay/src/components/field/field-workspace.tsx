'use client';

import {
  loadFieldGraph,
  loadFieldNodeBundle,
  syncFieldSemanticGraph,
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
  Maximize2,
  Network,
  RefreshCw,
  Search,
  StickyNote,
  Upload,
  X,
} from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

const TYPE_META: Record<string, { label: string; color: string; icon: typeof File }> = {
  collection: { label: 'Collections', color: 'rgb(var(--ink))', icon: Network },
  project: { label: 'Projects', color: 'rgb(var(--ink))', icon: FolderKanban },
  note: { label: 'Notes', color: 'rgb(var(--ink-muted))', icon: StickyNote },
  file: { label: 'Files', color: 'rgb(var(--ink-muted))', icon: File },
  todo: { label: 'To Do', color: 'rgb(var(--ink-faint))', icon: ListTodo },
  calendar_event: { label: 'Calendar', color: 'rgb(var(--ink-muted))', icon: CalendarDays },
  ravin_conversation: { label: 'RAVIN', color: 'rgb(var(--accent))', icon: Brain },
  memory: { label: 'Memory', color: 'rgb(var(--ink-muted))', icon: Brain },
  chat: { label: 'Chats', color: 'rgb(var(--ink-faint))', icon: Network },
  other: { label: 'Other', color: 'rgb(var(--ink-muted))', icon: File },
};

type FieldDisplayNode = RelayFieldNode & {
  virtual?: boolean;
  virtualCount?: number;
  parentId?: string;
  lodMinZoom?: number;
};

type FieldDisplayEdge = RelayFieldEdge & {
  virtual?: boolean;
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
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [graphSize, setGraphSize] = useState({ width: 1000, height: 700 });
  const [fitNonce, setFitNonce] = useState(0);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
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
        setHoveredNodeId(null);
        setHoverPoint(null);
      }
      if (
        event.key.toLowerCase() === 'f' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName ?? '').toUpperCase())
      ) {
        event.preventDefault();
        setZoom(1);
        setFitNonce((value) => value + 1);
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

  useEffect(() => {
    const element = graphRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setGraphSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  async function chooseNode(node: RelayFieldNode) {
    selectedIdRef.current = node.id;
    setSelected(node);
    setBundle(null);

    if ((node as FieldDisplayNode).virtual) {
      setBundleLoading(false);
      return;
    }

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
    setHoveredNodeId(null);
    setHoverPoint(null);
  }

  function updateHover(event: React.MouseEvent<SVGGElement>, node: RelayFieldNode) {
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredNodeId(node.id);
    setHoverPoint({
      x: Math.max(12, Math.min(rect.width - 210, event.clientX - rect.left + 14)),
      y: Math.max(12, Math.min(rect.height - 88, event.clientY - rect.top + 14)),
    });
  }

  function openNodeSource(node: RelayFieldNode) {
    const href = sourcePage(node.source_type);
    if (!href) return;
    window.location.assign(appPageUrl(href));
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

  async function syncGraph() {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      await syncFieldSemanticGraph();
      await refresh(selected?.id ?? null);
    } catch (syncError) {
      console.error('Field sync failed', syncError);
      setError('Field could not finish syncing right now.');
    } finally {
      setSyncing(false);
    }
  }

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    return counts;
  }, [nodes]);

  const displayGraph = useMemo(
    () => buildDisplayGraph(nodes, edges),
    [nodes, edges],
  );

  const visibleNodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return displayGraph.nodes.filter((node) => {
      if (typeFilter !== 'all' && node.type !== typeFilter) return false;

      if (
        node.lodMinZoom &&
        zoom < node.lodMinZoom &&
        !needle &&
        selected?.id !== node.id &&
        selected?.id !== node.parentId
      ) return false;

      if (!needle) return true;
      return `${node.title} ${node.searchable_text ?? ''} ${node.source_type}`.toLowerCase().includes(needle);
    });
  }, [displayGraph.nodes, query, typeFilter, zoom, selected]);

  const positions = useMemo(
    () => layoutNodes(displayGraph.nodes, displayGraph.edges),
    [displayGraph.nodes, displayGraph.edges],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => displayGraph.edges.filter((edge) => visibleIds.has(edge.source_node_id) && visibleIds.has(edge.target_node_id)),
    [displayGraph.edges, visibleIds],
  );
  const semanticEdgeCount = useMemo(
    () => visibleEdges.filter((edge) => edge.relation_type === 'semantic_related').length,
    [visibleEdges],
  );
  const focusNodeId = selected?.id ?? hoveredNodeId;
  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!focusNodeId) return ids;
    ids.add(focusNodeId);
    for (const edge of visibleEdges) {
      if (edge.source_node_id === focusNodeId) ids.add(edge.target_node_id);
      if (edge.target_node_id === focusNodeId) ids.add(edge.source_node_id);
    }
    return ids;
  }, [focusNodeId, visibleEdges]);
  const hoveredNode = useMemo(
    () => visibleNodes.find((node) => node.id === hoveredNodeId) ?? null,
    [visibleNodes, hoveredNodeId],
  );

  const fit = useMemo(
    () => calculateGraphFit({
      nodes: visibleNodes,
      positions,
      viewportWidth: graphSize.width,
      viewportHeight: graphSize.height,
      inspectorOpen: Boolean(selected),
      zoom,
    }),
    [visibleNodes, positions, graphSize, selected, zoom, fitNonce],
  );

  function fitGraph() {
    setZoom(1);
    setFitNonce((value) => value + 1);
  }

  return (
    <section className="relative flex h-[calc(100vh-65px)] min-h-[640px] w-full flex-col overflow-hidden bg-canvas dark:bg-black">
      <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-border bg-canvas px-5 py-3 dark:bg-black md:px-7">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-medium tracking-tight text-ink">Field</h1>
          <p className="mt-1 truncate text-xs text-ink-muted">
            {loading ? 'Syncing your knowledge…' : `${visibleNodes.length} nodes · ${visibleEdges.length} relationships`}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
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
            onClick={() => void syncGraph()}
            disabled={loading || syncing}
            aria-label="Sync Field"
            title="Sync Field"
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[11px] font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{syncing ? 'Syncing…' : 'Sync'}</span>
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

        <main ref={graphRef} className="relative min-h-0 overflow-hidden bg-canvas dark:bg-black">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 md:px-5">
            <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-border bg-canvas/80 p-1 backdrop-blur-xl dark:bg-black/80">
              <button
                type="button"
                onClick={fitGraph}
                className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[9px] text-ink-faint hover:bg-surface hover:text-ink"
                aria-label="Fit graph"
                title="Fit graph"
              >
                <Maximize2 size={11} />
                <span className="hidden sm:inline">Fit</span>
              </button>
              <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(.62, value - .12))}
                className="h-7 w-7 rounded-md text-[13px] text-ink-faint hover:bg-surface hover:text-ink"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="min-w-10 text-center text-[9px] tabular-nums text-ink-faint">{Math.round(fit.effectiveScale * 100)}%</span>
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
            <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet" className="h-full w-full select-none" role="img" aria-label="Field knowledge graph">
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

              <g transform={`translate(${fit.translateX} ${fit.translateY}) scale(${fit.effectiveScale})`}>
                {visibleEdges.map((edge) => {
                  const a = positions.get(edge.source_node_id);
                  const b = positions.get(edge.target_node_id);
                  if (!a || !b) return null;
                  const semantic = edge.relation_type === 'semantic_related';
                  const highlighted = focusNodeId && (edge.source_node_id === focusNodeId || edge.target_node_id === focusNodeId);
                  const dimmed = Boolean(focusNodeId) && !highlighted;
                  return (
                    <line
                      key={edge.id}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="currentColor"
                      strokeOpacity={highlighted ? .46 : dimmed ? .025 : semantic ? Math.max(.07, edge.strength * .15) : Math.max(.055, edge.strength * .12)}
                      strokeWidth={highlighted ? 1.4 : semantic ? .82 : .7}
                      strokeDasharray={semantic ? '3.5 5' : undefined}
                    />
                  );
                })}

                {visibleNodes.map((node) => {
                  const position = positions.get(node.id)!;
                  const meta = TYPE_META[node.type] ?? TYPE_META.other!;
                  const isSelected = selected?.id === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isHub = node.type === 'collection' || node.type === 'project';
                  const inFocus = !focusNodeId || connectedIds.has(node.id);
                  const showLabel = isSelected || isHovered || isHub || (Boolean(selected) && inFocus);
                  const radius = isSelected ? 8 : isHovered ? 6.6 : node.type === 'collection' ? 7.2 : node.type === 'project' ? 6.2 : 4.6;
                  const completed = node.type === 'todo' && Boolean((node.metadata as Record<string, unknown>)?.completed);
                  const recentlyUpdated = isRecentlyUpdated(node.updated_at);

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${position.x} ${position.y})`}
                      role="button"
                      tabIndex={0}
                      aria-label={node.title}
                      className="cursor-pointer outline-none transition-opacity duration-150"
                      opacity={inFocus ? 1 : .16}
                      onClick={() => void chooseNode(node)}
                      onDoubleClick={() => openNodeSource(node)}
                      onMouseEnter={(event) => updateHover(event, node)}
                      onMouseMove={(event) => updateHover(event, node)}
                      onMouseLeave={() => {
                        setHoveredNodeId(null);
                        setHoverPoint(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          void chooseNode(node);
                        }
                        if (event.key === 'Enter' && event.shiftKey) {
                          event.preventDefault();
                          openNodeSource(node);
                        }
                      }}
                    >
                      {(isSelected || isHub || recentlyUpdated) && (
                        <circle
                          r={isSelected ? 31 : node.type === 'collection' ? 25 : recentlyUpdated ? 17 : 20}
                          fill={meta.color}
                          opacity={isSelected ? .09 : recentlyUpdated ? .025 : .035}
                        />
                      )}
                      <circle r={radius + 4} fill="none" stroke={meta.color} strokeOpacity={isSelected ? .42 : isHub ? .16 : .08} />

                      {node.type === 'file' ? (
                        <polygon
                          points={hexagonPoints(radius)}
                          fill={isSelected ? 'rgb(var(--ink))' : meta.color}
                          opacity={isSelected ? 1 : isHovered ? .96 : .76}
                        />
                      ) : (
                        <circle r={radius} fill={isSelected ? 'rgb(var(--ink))' : meta.color} opacity={isSelected ? 1 : isHovered ? .96 : isHub ? .9 : .72} />
                      )}

                      {node.type === 'todo' && (
                        <circle
                          r={radius + 7}
                          fill="none"
                          stroke={meta.color}
                          strokeOpacity={completed ? .28 : .55}
                          strokeWidth={1.05}
                          pathLength={100}
                          strokeDasharray={completed ? '100 0' : '68 32'}
                          transform="rotate(-90)"
                        />
                      )}

                      {showLabel && (
                        <>
                          <text
                            y={node.type === 'collection' ? 20 : 18}
                            textAnchor="middle"
                            fontSize={isSelected ? 10 : node.type === 'collection' ? 9.2 : 8.5}
                            fill="currentColor"
                            opacity={isSelected || isHovered ? .96 : isHub ? .64 : .5}
                          >
                            {truncate(node.title, 28)}
                          </text>
                          {(node as FieldDisplayNode).virtual && (
                            <text
                              y={31}
                              textAnchor="middle"
                              fontSize={7}
                              fill="currentColor"
                              opacity={.38}
                            >
                              {(node as FieldDisplayNode).virtualCount ?? 0} items
                            </text>
                          )}
                        </>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-end justify-between text-[9px] text-ink-faint md:left-5">
            <span>Click inspect · Double-click open · F fit · Esc close</span>
            <span className="hidden sm:inline">Field · Resonant Assist</span>
          </div>

          {hoveredNode && hoverPoint && hoveredNode.id !== selected?.id && (
            <div
              className="pointer-events-none absolute z-20 w-[190px] rounded-lg border border-border bg-canvas/90 px-3 py-2.5 shadow-xl backdrop-blur-xl dark:bg-black/90"
              style={{ left: hoverPoint.x, top: hoverPoint.y }}
            >
              <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {TYPE_META[hoveredNode.type]?.label ?? hoveredNode.type}
              </div>
              <div className="mt-1 truncate text-[11px] font-medium text-ink">{hoveredNode.title}</div>
              <div className="mt-1 text-[9px] text-ink-faint">{hoveredNode.source_product} · {hoveredNode.source_type}</div>
            </div>
          )}

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
      className={`group flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[11px] transition-colors ${active ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:bg-surface hover:text-ink'}`}
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

type GraphFitInput = {
  nodes: RelayFieldNode[];
  positions: Map<string, { x: number; y: number }>;
  viewportWidth: number;
  viewportHeight: number;
  inspectorOpen: boolean;
  zoom: number;
};

function calculateGraphFit({
  nodes,
  positions,
  viewportWidth,
  inspectorOpen,
  zoom,
}: GraphFitInput) {
  const points = nodes.map((node) => positions.get(node.id)).filter((point): point is { x: number; y: number } => Boolean(point));

  if (points.length === 0) {
    return {
      effectiveScale: zoom,
      translateX: 500 - 500 * zoom,
      translateY: 350 - 350 * zoom,
    };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Label/ring breathing room in graph coordinates.
  const graphPaddingX = 72;
  const graphPaddingY = 64;
  const boundsWidth = Math.max(120, maxX - minX + graphPaddingX * 2);
  const boundsHeight = Math.max(120, maxY - minY + graphPaddingY * 2);

  // Convert the inspector's real pixel width into the fixed 1000-unit SVG viewBox.
  const inspectorPixels = inspectorOpen ? Math.min(360, viewportWidth * .42) : 0;
  const inspectorUnits = viewportWidth > 0 ? (inspectorPixels / viewportWidth) * 1000 : 0;
  const availableWidth = Math.max(360, 1000 - inspectorUnits - 72);
  const availableHeight = 700 - 92;

  const baseScale = Math.max(.56, Math.min(1.48, Math.min(
    availableWidth / boundsWidth,
    availableHeight / boundsHeight,
  )));
  const effectiveScale = Math.max(.42, Math.min(2.15, baseScale * zoom));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const targetCenterX = (1000 - inspectorUnits) / 2;
  const targetCenterY = 352;

  return {
    effectiveScale,
    translateX: targetCenterX - centerX * effectiveScale,
    translateY: targetCenterY - centerY * effectiveScale,
  };
}

function buildDisplayGraph(
  nodes: RelayFieldNode[],
  edges: RelayFieldEdge[],
): { nodes: FieldDisplayNode[]; edges: FieldDisplayEdge[] } {
  const displayNodes = nodes.map((node) => ({ ...node })) as FieldDisplayNode[];
  let displayEdges = edges.map((edge) => ({ ...edge })) as FieldDisplayEdge[];

  const byId = new Map(displayNodes.map((node) => [node.id, node]));
  const todoHub = displayNodes.find((node) =>
    node.type === 'collection'
    && (
      /todo/i.test(node.title)
      || /todo/i.test(node.source_type)
      || /todo/i.test(String((node.metadata as Record<string, unknown>)?.collection ?? ''))
    )
  );

  if (!todoHub) return { nodes: displayNodes, edges: displayEdges };

  const directTodoEdges = displayEdges.filter(
    (edge) =>
      edge.relation_type === 'contains'
      && edge.source_node_id === todoHub.id
      && byId.get(edge.target_node_id)?.type === 'todo',
  );

  if (directTodoEdges.length < 16) return { nodes: displayNodes, edges: displayEdges };

  const todoIds = new Set(directTodoEdges.map((edge) => edge.target_node_id));
  const groups = new Map<string, FieldDisplayNode[]>();

  for (const id of todoIds) {
    const node = byId.get(id);
    if (!node) continue;
    const key = todoGroup(node);
    groups.set(key, [...(groups.get(key) ?? []), node]);
  }

  const virtualEdges: FieldDisplayEdge[] = [];
  const virtualNodes: FieldDisplayNode[] = [];
  const groupOrder = ['overdue', 'today', 'soon', 'later', 'unscheduled', 'completed'];

  for (const key of groupOrder) {
    const children = groups.get(key) ?? [];
    if (children.length === 0) continue;

    const virtualId = `virtual:todos:${key}`;
    const newest = [...children]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? todoHub;

    const virtualNode: FieldDisplayNode = {
      ...todoHub,
      id: virtualId,
      type: 'collection',
      title: todoGroupTitle(key),
      searchable_text: `${children.length} ${children.length === 1 ? 'task' : 'tasks'}`,
      source_product: 'field-ui',
      source_id: virtualId,
      source_type: 'virtual_cluster',
      metadata: { virtual: true, count: children.length },
      created_at: newest.created_at,
      updated_at: newest.updated_at,
      virtual: true,
      virtualCount: children.length,
      parentId: todoHub.id,
    };

    virtualNodes.push(virtualNode);

    virtualEdges.push({
      ...directTodoEdges[0]!,
      id: `virtual-edge:${todoHub.id}:${virtualId}`,
      source_node_id: todoHub.id,
      target_node_id: virtualId,
      relation_type: 'contains',
      strength: .9,
      origin: 'field-ui',
      metadata: { virtual: true },
      virtual: true,
    });

    children.forEach((child, index) => {
      child.parentId = virtualId;
      child.lodMinZoom = 1.65;
      child.metadata = {
        ...(child.metadata as Record<string, unknown>),
        field_group_index: index,
      };

      virtualEdges.push({
        ...directTodoEdges[0]!,
        id: `virtual-edge:${virtualId}:${child.id}`,
        source_node_id: virtualId,
        target_node_id: child.id,
        relation_type: 'contains',
        strength: .82,
        origin: 'field-ui',
        metadata: { virtual: true },
        virtual: true,
      });
    });
  }

  displayEdges = displayEdges.filter(
    (edge) =>
      !(
        edge.relation_type === 'contains'
        && edge.source_node_id === todoHub.id
        && todoIds.has(edge.target_node_id)
      ),
  );

  const allNodes = [...displayNodes, ...virtualNodes];
  const allEdges = [...displayEdges, ...virtualEdges];
  const workspaces = allNodes.filter(
    (node) => node.type === 'collection' && node.source_type === 'workspace',
  );

  if (workspaces.length === 0) {
    return { nodes: allNodes, edges: allEdges };
  }

  const newest = [...workspaces].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]!;
  const fieldRoot: FieldDisplayNode = {
    ...newest,
    id: 'virtual:field:root',
    title: 'My Field',
    searchable_text: 'Your connected Resonant knowledge',
    source_product: 'field-ui',
    source_id: 'virtual:field:root',
    source_type: 'field_root',
    metadata: { virtual: true, field_root: true },
    virtual: true,
    virtualCount: workspaces.length,
  };

  const rootEdges: FieldDisplayEdge[] = workspaces.map((workspace) => ({
    ...displayEdges[0]!,
    id: `virtual-edge:field-root:${workspace.id}`,
    user_id: workspace.user_id,
    source_node_id: fieldRoot.id,
    target_node_id: workspace.id,
    relation_type: 'contains',
    strength: 1,
    origin: 'field-ui',
    metadata: { virtual: true },
    created_at: workspace.created_at,
    updated_at: workspace.updated_at,
    virtual: true,
  }));

  return {
    nodes: [...allNodes, fieldRoot],
    edges: [...allEdges, ...rootEdges],
  };
}

function todoGroup(node: FieldDisplayNode) {
  const metadata = node.metadata as Record<string, unknown>;
  if (Boolean(metadata?.completed)) return 'completed';

  const due = parseDateOnly(metadata?.due_on);
  if (!due) return 'unscheduled';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const difference = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (difference < 0) return 'overdue';
  if (difference === 0) return 'today';
  if (difference <= 7) return 'soon';
  return 'later';
}

function todoGroupTitle(key: string) {
  return ({
    overdue: 'Overdue',
    today: 'Today',
    soon: 'Soon',
    later: 'Later',
    unscheduled: 'No date',
    completed: 'Completed',
  } as Record<string, string>)[key] ?? 'Tasks';
}

function parseDateOnly(value: unknown) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function layoutNodes(
  nodes: FieldDisplayNode[],
  edges: FieldDisplayEdge[],
) {
  const positions = new Map<string, { x: number; y: number }>();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string, string[]>();

  for (const edge of edges) {
    if (edge.relation_type !== 'contains') continue;
    children.set(edge.source_node_id, [
      ...(children.get(edge.source_node_id) ?? []),
      edge.target_node_id,
    ]);
  }

  const root = nodes.find((node) => node.type === 'collection' && node.source_type === 'field_root')
    ?? nodes.find((node) => node.type === 'collection' && node.source_type === 'workspace')
    ?? nodes.find((node) => node.type === 'collection' && /^relay$/i.test(node.title))
    ?? nodes.find((node) => node.type === 'collection');

  if (root) positions.set(root.id, { x: 500, y: 350 });

  const rootChildren = (children.get(root?.id ?? '') ?? [])
    .map((id) => byId.get(id))
    .filter((node): node is FieldDisplayNode => Boolean(node))
    .filter((node) => node.type === 'collection')
    .sort((a, b) => a.title.localeCompare(b.title));

  const rootRadius = rootChildren.length <= 4 ? 215 : 250;
  rootChildren.forEach((node, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / Math.max(rootChildren.length, 1));
    const point = {
      x: 500 + Math.cos(angle) * rootRadius,
      y: 350 + Math.sin(angle) * rootRadius * .68,
    };
    positions.set(node.id, point);
    layoutChildren(node.id, point, children, byId, positions, 0);
  });

  const remaining = nodes.filter((node) => !positions.has(node.id));
  remaining.forEach((node, index) => {
    const center = GROUP_CENTERS[node.type] ?? GROUP_CENTERS.other!;
    const angle = index * 2.399963229728653;
    const radius = 44 + Math.sqrt(index + 1) * 11;
    positions.set(node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  });

  return positions;
}

function layoutChildren(
  parentId: string,
  parent: { x: number; y: number },
  children: Map<string, string[]>,
  byId: Map<string, FieldDisplayNode>,
  positions: Map<string, { x: number; y: number }>,
  depth: number,
) {
  const childNodes = (children.get(parentId) ?? [])
    .map((id) => byId.get(id))
    .filter((node): node is FieldDisplayNode => Boolean(node));

  if (childNodes.length === 0) return;

  const virtual = childNodes.filter((node) => node.virtual);
  const normal = childNodes.filter((node) => !node.virtual);

  virtual.forEach((node, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / Math.max(virtual.length, 1));
    const point = {
      x: parent.x + Math.cos(angle) * 78,
      y: parent.y + Math.sin(angle) * 78,
    };
    positions.set(node.id, point);
    layoutChildren(node.id, point, children, byId, positions, depth + 1);
  });

  normal.forEach((node, index) => {
    const angle = index * 2.399963229728653;
    const distance = (depth > 0 ? 50 : 68) + Math.sqrt(index + 1) * (depth > 0 ? 8.5 : 11);
    const point = {
      x: parent.x + Math.cos(angle) * distance,
      y: parent.y + Math.sin(angle) * distance,
    };
    positions.set(node.id, point);
    layoutChildren(node.id, point, children, byId, positions, depth + 1);
  });
}

function hexagonPoints(radius: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / 6);
    return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
  }).join(' ');
}

function isRecentlyUpdated(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp < 86_400_000;
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
