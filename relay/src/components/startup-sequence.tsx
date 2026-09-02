'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = 'relay-startup-seen';

export function StartupSequence() {
  const [visible, setVisible] = useState(() => typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) !== '1');
  const [activated, setActivated] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!activated) return;
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1');
      setFinished(true);
      window.setTimeout(() => setVisible(false), 500);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [activated]);

  if (!visible) return null;

  return <div className={`fixed inset-0 z-[100] overflow-hidden bg-black transition-colors duration-700 ${finished ? 'bg-white' : ''}`} role="dialog" aria-label="Relay introduction"><button type="button" onClick={() => { sessionStorage.setItem(SESSION_KEY, '1'); setVisible(false); }} className="absolute right-5 top-5 z-20 text-xs text-white/60 underline underline-offset-4 transition-colors hover:text-white">Skip intro</button><button type="button" aria-label="Start Relay intro" onClick={() => setActivated(true)} className="absolute inset-0 flex items-center justify-center"><span className={`startup-core ${activated ? 'startup-core-active' : ''}`}><span className="startup-orbit startup-orbit-one" /><span className="startup-orbit startup-orbit-two" /><span className="startup-dot" /></span></button>{activated && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-white transition-colors duration-700"><p className="startup-word startup-word-resonant">Resonant</p><p className="startup-word startup-word-relay">Relay</p><p className={`startup-welcome ${finished ? 'text-black' : ''}`}>welcome...</p></div>}<div className={`startup-particles ${activated ? 'startup-particles-active' : ''}`} aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ '--i': index } as React.CSSProperties} />)}</div></div>;
}
