'use client';

import { BASE_PATH } from '@/lib/config';
import { useEffect } from 'react';

const INTERACTIVE_SELECTOR = 'button:not(:disabled), a[href], [role="button"]';

function canPlaySound(element: HTMLElement) {
  return element.getAttribute('aria-disabled') !== 'true'
    && !element.closest('[data-relay-sound="none"]');
}

function restart(audio: HTMLAudioElement) {
  audio.currentTime = 0;
  void audio.play().catch(() => {
    // Browsers can block sound until the first intentional interaction.
  });
}

export function UiSoundEffects() {
  useEffect(() => {
    const clickSounds = Array.from({ length: 3 }, () => {
      const audio = new Audio(`${BASE_PATH}/audio/ui-click-soundshelfstudio.mp3`);
      audio.preload = 'auto';
      audio.volume = 0.2;
      return audio;
    });
    const hoverSound = new Audio(`${BASE_PATH}/audio/ui-hover-denielcz.mp3`);
    hoverSound.preload = 'auto';
    hoverSound.volume = 0.11;

    let clickIndex = 0;
    let lastHoverAt = 0;

    const findInteractive = (target: EventTarget | null) => (
      target instanceof Element ? target.closest<HTMLElement>(INTERACTIVE_SELECTOR) : null
    );

    const onClick = (event: MouseEvent) => {
      const interactive = findInteractive(event.target);
      if (!interactive || !canPlaySound(interactive)) return;
      const audio = clickSounds[clickIndex % clickSounds.length]!;
      clickIndex += 1;
      restart(audio);
    };

    const onPointerOver = (event: PointerEvent) => {
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      const interactive = findInteractive(event.target);
      if (!interactive || !canPlaySound(interactive)) return;
      if (event.relatedTarget instanceof Node && interactive.contains(event.relatedTarget)) return;

      const now = performance.now();
      if (now - lastHoverAt < 70) return;
      lastHoverAt = now;
      restart(hoverSound);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('pointerover', onPointerOver, true);

    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('pointerover', onPointerOver, true);
      hoverSound.pause();
      clickSounds.forEach((audio) => audio.pause());
    };
  }, []);

  return null;
}
