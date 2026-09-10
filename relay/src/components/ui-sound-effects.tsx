'use client';

import { BASE_PATH } from '@/lib/config';
import { useEffect } from 'react';

const INTERACTIVE_SELECTOR = 'button:not(:disabled), a[href], [role="button"]';
const NAVIGATION_SOUND_HEADSTART_MS = 80;

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

function internalNavigationTarget(event: MouseEvent, interactive: HTMLElement) {
  if (event.defaultPrevented) return null;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = interactive.closest<HTMLAnchorElement>('a[href]');
  if (!anchor || anchor.hasAttribute('download')) return null;
  if (anchor.target && anchor.target !== '_self') return null;

  try {
    const target = new URL(anchor.href, window.location.href);
    if (target.origin !== window.location.origin) return null;
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return null;
    return target.href;
  } catch {
    return null;
  }
}

export function UiSoundEffects() {
  useEffect(() => {
    const clickSounds = Array.from({ length: 4 }, () => {
      const audio = new Audio(`${BASE_PATH}/audio/ui-click-soundreality.mp3`);
      audio.preload = 'auto';
      audio.volume = 0.2;
      return audio;
    });
    const hoverSound = new Audio(`${BASE_PATH}/audio/ui-hover-denielcz.mp3`);
    hoverSound.preload = 'auto';
    hoverSound.volume = 0.11;

    let clickIndex = 0;
    let lastHoverAt = 0;
    let lastPointerInteractive: HTMLElement | null = null;
    let lastPointerAt = 0;

    const findInteractive = (target: EventTarget | null) => (
      target instanceof Element ? target.closest<HTMLElement>(INTERACTIVE_SELECTOR) : null
    );

    const playClick = () => {
      const audio = clickSounds[clickIndex % clickSounds.length]!;
      clickIndex += 1;
      restart(audio);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const interactive = findInteractive(event.target);
      if (!interactive || !canPlaySound(interactive)) return;
      playClick();
      lastPointerInteractive = interactive;
      lastPointerAt = performance.now();
    };

    const onClick = (event: MouseEvent) => {
      const interactive = findInteractive(event.target);
      if (!interactive || !canPlaySound(interactive)) return;

      const pointerAlreadyPlayed = lastPointerInteractive === interactive
        && performance.now() - lastPointerAt < 800;
      if (!pointerAlreadyPlayed) playClick();
      lastPointerInteractive = null;

      const navigationTarget = internalNavigationTarget(event, interactive);
      if (!navigationTarget) return;

      // Normal anchors unload the document immediately, which can chop the UI
      // sound off. Give the click a tiny head start before changing pages.
      event.preventDefault();
      window.setTimeout(() => window.location.assign(navigationTarget), NAVIGATION_SOUND_HEADSTART_MS);
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

    document.addEventListener('pointerdown', onPointerDown, true);
    // Let app navigation handlers claim the click first. Capturing here forced
    // a document reload before the beta workspace could animate the route.
    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', onPointerOver, true);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerover', onPointerOver, true);
      hoverSound.pause();
      clickSounds.forEach((audio) => audio.pause());
    };
  }, []);

  return null;
}
