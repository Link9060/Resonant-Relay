'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('relay-theme', next ? 'dark' : 'light');
    setIsDark(next);
  }

  // Avoid rendering the wrong icon before we know the real state.
  if (isDark === null) return <div className="h-10 w-10 md:h-9 md:w-9" />;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink md:h-9 md:w-9 md:rounded-md"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
