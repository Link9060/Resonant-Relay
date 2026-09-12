'use client';

import { experiences, palettes, readExperience, saveExperience, RelayExperience, RelayPalette } from '@/lib/experience-mode';
import { useEffect, useState } from 'react';

export function ExperienceControls() {
  const [experience, setExperience] = useState<RelayExperience>('relay');
  const [palette, setPalette] = useState<RelayPalette>('monochrome');
  const [intensity, setIntensity] = useState(55);

  useEffect(() => {
    const saved = readExperience();
    setExperience(saved.experience);
    setPalette(saved.palette);
    setIntensity(saved.intensity);
  }, []);

  function update(nextExperience = experience, nextPalette = palette, nextIntensity = intensity) {
    setExperience(nextExperience); setPalette(nextPalette); setIntensity(nextIntensity);
    saveExperience(nextExperience, nextPalette, nextIntensity);
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div><h3 className="text-sm font-semibold text-ink">Relay Experience</h3><p className="mt-1 text-xs leading-5 text-ink-faint">Choose how Relay behaves, then make the color system yours.</p></div>
        <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-ink-muted">1.0.4</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {experiences.map((option) => <button key={option.id} type="button" onClick={() => update(option.id)} className={`rounded-xl border p-3 text-left transition ${experience === option.id ? 'border-ink bg-ink text-canvas' : 'border-border bg-canvas text-ink hover:bg-surface-raised'}`}><div className="text-sm font-semibold">{option.name}</div><div className={`mt-1 text-xs leading-5 ${experience === option.id ? 'opacity-70' : 'text-ink-faint'}`}>{option.description}</div></button>)}
      </div>
      <div className="mt-5 border-t border-border pt-4"><div className="text-xs font-medium text-ink-muted">Palette</div><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{palettes.map((option) => <button key={option.id} type="button" onClick={() => update(experience, option.id)} className={`rounded-lg border px-2.5 py-2 text-left text-xs ${palette === option.id ? 'border-ink' : 'border-border'}`}><span className="mb-1.5 flex gap-1">{option.swatches.map((color) => <span key={color} className="h-3 w-3 rounded-full border border-black/10" style={{ background: color }} />)}</span><span className="text-ink">{option.name}</span></button>)}</div></div>
      <label className="mt-5 block border-t border-border pt-4"><span className="flex justify-between text-xs font-medium text-ink-muted"><span>Visual intensity</span><span>{intensity}%</span></span><input className="mt-3 w-full accent-current" type="range" min="0" max="100" value={intensity} onChange={(event) => update(experience, palette, Number(event.target.value))} /><span className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-ink-faint"><span>Calm</span><span>Expressive</span></span></label>
    </div>
  );
}
