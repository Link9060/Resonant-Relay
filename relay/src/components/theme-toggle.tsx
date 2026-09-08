'use client';

import { IS_BETA } from '@/lib/config';
import { emitParticles, reducedMotion } from '@/lib/particle-motion';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function ThemeToggle() {
  const timerRef = useRef(0);
  const [changing, setChanging] = useState(false);
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timerRef.current); };
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    const apply = () => {
      document.documentElement.classList.toggle('dark', next);
      try { localStorage.setItem('relay-theme', next ? 'dark' : 'light'); } catch { /* Theme still works without storage. */ }
      setIsDark(next);
    };
    if (IS_BETA && !reducedMotion() && document.querySelector('.beta-experience')) {
      if (changing) return;
      setChanging(true);
      emitParticles({ kind: 'theme', dark: next });
      timerRef.current = window.setTimeout(() => {
        apply();
        timerRef.current = window.setTimeout(() => setChanging(false), 500);
      }, 500);
    } else apply();
  }

  // Avoid rendering the wrong icon before we know the real state.
  if (isDark === null) return <div className="h-10 w-10 md:h-9 md:w-9" />;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={changing}
      aria-busy={changing}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink md:h-9 md:w-9 md:rounded-md"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
