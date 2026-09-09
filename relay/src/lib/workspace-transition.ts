export const PANEL_CLOSE_MS = 640;
export const PANEL_OPEN_MS = 780;
export type PanelPhase = 'open' | 'opening' | 'closing' | 'hidden';

type TransitionHost = {
  current: () => string;
  landing: (href: string) => boolean;
  reduced: () => boolean;
  phase: (phase: PanelPhase) => void;
  particles: (kind: 'open' | 'close') => void;
  navigate: (href: string) => void;
  recover: (href: string) => void;
  schedule: (callback: () => void, ms: number) => number;
  cancel: (id: number) => void;
};

/** One pending destination, one transition timer, and one navigation watchdog.
 * Route commits, not guessed load times, determine when content can appear. */
export function createWorkspaceTransition(host: TransitionHost) {
  let timer = 0, watchdog = 0;
  let stage: PanelPhase | 'waiting' = 'hidden';
  let desired: string | null = null, expected: string | null = null;
  let disposed = false, heldForLoading = false;
  const clear = () => { host.cancel(timer); host.cancel(watchdog); timer = watchdog = 0; };
  const phase = (next: PanelPhase) => { stage = next; host.phase(next); };
  const reveal = (delay = 0) => {
    clear();
    if (heldForLoading) { phase('hidden'); return; }
    if (host.landing(host.current())) { phase('hidden'); return; }
    phase('hidden');
    timer = host.schedule(() => {
      if (disposed) return;
      phase('opening'); host.particles('open');
      timer = host.schedule(() => { if (!disposed) phase('open'); }, host.reduced() ? 0 : PANEL_OPEN_MS);
    }, delay);
  };
  const navigate = () => {
    if (disposed || !desired) return;
    if (desired === host.current()) { desired = null; reveal(); return; }
    expected = desired;
    stage = 'waiting'; host.phase('hidden');
    watchdog = host.schedule(() => { if (!disposed) host.recover(desired ?? expected!); }, 8000);
    host.navigate(expected);
  };
  return {
    reveal,
    request(href: string) {
      if (disposed) return;
      desired = href;
      if (stage === 'waiting' || stage === 'closing') return;
      if (href === host.current()) { desired = null; return; }
      clear();
      if (stage === 'hidden' || host.landing(host.current()) || host.reduced()) { navigate(); return; }
      phase('closing'); host.particles('close');
      timer = host.schedule(navigate, PANEL_CLOSE_MS);
    },
    committed() {
      if (disposed) return;
      clear();
      if (expected && host.current() === expected && desired && desired !== expected) { navigate(); return; }
      desired = expected = null;
      reveal();
    },
    holdForLoading(active: boolean) {
      if (disposed || heldForLoading === active) return;
      heldForLoading = active;
      if (active) { clear(); phase('hidden'); }
      else reveal();
    },
    historyChanged() { if (!disposed) { clear(); desired = expected = null; phase('hidden'); } },
    dispose() { disposed = true; clear(); },
  };
}
