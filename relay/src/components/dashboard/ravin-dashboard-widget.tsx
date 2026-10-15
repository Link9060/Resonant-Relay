'use client';

import { IS_BETA } from '@/lib/config';
import { ArrowUpRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';

const STARTERS = [
  { label: 'Plan my day', prompt: 'Help me plan today using my available ARROW tasks and calendar. Ask about any missing context before suggesting a schedule.' },
  { label: 'Brain dump', prompt: 'Help me organize a brain dump into tasks, notes, and possible calendar events. Ask me to share my thoughts first, then let me review the plan before making changes.' },
  { label: 'Find my next step', prompt: 'Help me choose my next step using my available ARROW context. Explain your suggestion and ask about anything you cannot see.' },
];

export function ravinDashboardUrl(prompt: string, beta = IS_BETA) {
  const query = new URLSearchParams({ from: 'relay', surface: 'relay', prompt: prompt.trim() });
  return `${beta ? '/Resonant-Relay/arrow/ravin/' : '/ravin/'}?${query}`;
}

export function RavinDashboardWidget({ compact = false, micro = false }: { compact?: boolean; micro?: boolean }) {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  function openRavin(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) return;
    const target = ravinDashboardUrl(prompt);
    const shell = (window as Window & { ArrowOS?: { navigate?: (href: string, module: string) => void } }).ArrowOS;
    try {
      if (shell?.navigate) shell.navigate(target, 'ravin');
      else window.location.assign(target);
    } catch {
      setError('RAVIN could not open. Your question is still here—try again.');
    }
  }

  return <div className={`flex min-h-0 flex-col ${compact ? 'gap-2' : 'gap-3'}`}>
    {!compact && <p className="text-sm leading-5 text-ink-muted">A clearer next step starts here.</p>}
    <form onSubmit={openRavin} className={`rounded-xl border border-border bg-canvas transition-colors focus-within:border-ink-muted ${micro ? 'p-1' : 'p-2'}`}>
      <div className="flex items-end gap-2">
        <textarea aria-label="Question for RAVIN" value={prompt} maxLength={4000} rows={compact ? 1 : 2} onChange={event => { setPrompt(event.target.value); setError(''); }} placeholder="Ask a question or drop your thoughts…" className={`min-w-0 flex-1 resize-none bg-transparent outline-none placeholder:text-ink-faint ${micro ? 'px-1 text-xs' : 'px-2 py-1 text-sm'}`} />
        <button type="submit" aria-label="Open draft in RAVIN" title="Open draft in RAVIN" disabled={!prompt.trim()} className={`grid shrink-0 place-items-center rounded-full bg-ink text-canvas transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-35 ${micro ? 'h-7 w-7' : 'h-9 w-9'}`}><ArrowUpRight size={micro ? 13 : 16} /></button>
      </div>
    </form>
    {!micro && <>
      <div className="flex flex-wrap gap-1.5" aria-label="RAVIN starting points">{(compact ? STARTERS.slice(0, 2) : STARTERS).map(starter => <button key={starter.label} type="button" onClick={() => { setPrompt(starter.prompt); setError(''); }} className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink">{starter.label}</button>)}</div>
      {!compact && <p className="text-xs leading-5 text-ink-faint">Opens a draft in RAVIN. Review it before sending.</p>}
    </>}
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
  </div>;
}
