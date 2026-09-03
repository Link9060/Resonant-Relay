'use client';

import { BASE_PATH } from '@/lib/config';
import { useEffect, useRef, useState } from 'react';

export const STARTUP_SESSION_KEY = 'relay-startup-seen';

type Particle = {
  targetX: number;
  targetY: number;
  burstX: number;
  burstY: number;
  radius: number;
  delay: number;
};

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function ParticleWordmark({ active, formed, onFormed }: { active: boolean; formed: boolean; onFormed: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFormedRef = useRef(onFormed);

  useEffect(() => { onFormedRef.current = onFormed; }, [onFormed]);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrame = 0;
    let formationReported = false;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * density);
    canvas.height = Math.floor(height * density);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(density, 0, 0, density, 0, 0);

    const textCanvas = document.createElement('canvas');
    textCanvas.width = width;
    textCanvas.height = height;
    const textContext = textCanvas.getContext('2d', { willReadFrequently: true });
    if (!textContext) return;

    const relaySize = Math.max(58, Math.min(92, width * 0.16));
    const logoSize = relaySize * 0.92;
    const gap = relaySize * 0.22;
    textContext.fillStyle = '#ffffff';
    textContext.strokeStyle = '#ffffff';
    textContext.textAlign = 'left';
    textContext.textBaseline = 'middle';
    textContext.font = `600 ${relaySize}px system-ui, -apple-system, sans-serif`;
    const textWidth = textContext.measureText('Relay').width;
    const groupWidth = logoSize + gap + textWidth;
    const groupLeft = width / 2 - groupWidth / 2;
    const centerY = height / 2;
    const logoX = groupLeft + logoSize / 2;
    const textX = groupLeft + logoSize + gap;

    // A six-segment swirl guides the particles into the same silhouette as the final mark.
    textContext.lineCap = 'round';
    textContext.lineWidth = Math.max(7, logoSize * 0.13);
    for (let index = 0; index < 6; index += 1) {
      const angle = index * (Math.PI / 3) - Math.PI / 2;
      textContext.beginPath();
      textContext.arc(logoX, centerY, logoSize * 0.3, angle, angle + Math.PI * 0.72);
      textContext.stroke();
    }
    textContext.fillText('Relay', textX, centerY + relaySize * 0.01);

    const pixels = textContext.getImageData(0, 0, width, height).data;
    const destinations: Array<{ x: number; y: number }> = [];
    const sampleStep = width < 520 ? 4 : 5;
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        if ((pixels[(y * width + x) * 4 + 3] ?? 0) > 120) destinations.push({ x, y });
      }
    }

    for (let index = destinations.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const current = destinations[index]!;
      destinations[index] = destinations[swapIndex]!;
      destinations[swapIndex] = current;
    }

    const limit = width < 520 ? 700 : 1050;
    const particles: Particle[] = destinations.slice(0, limit).map((destination, index) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 52 + Math.random() * Math.min(200, width * 0.25);
      return {
        targetX: destination.x,
        targetY: destination.y,
        burstX: width / 2 + Math.cos(angle) * distance,
        burstY: centerY + Math.sin(angle) * distance,
        radius: 0.85 + Math.random() * 1.15,
        delay: (index % 23) * 7 + Math.random() * 75,
      };
    });

    const startedAt = performance.now();
    const draw = (now: number) => {
      const elapsed = now - startedAt;
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#ffffff';

      for (const particle of particles) {
        const burstProgress = easeOutCubic(clamp(elapsed / 430));
        const settleProgress = easeInOutCubic(clamp((elapsed - 280 - particle.delay) / 1350));
        const mergeProgress = easeInOutCubic(clamp((elapsed - 1575 - particle.delay * 0.12) / 500));
        const burstX = width / 2 + (particle.burstX - width / 2) * burstProgress;
        const burstY = centerY + (particle.burstY - centerY) * burstProgress;
        const x = burstX + (particle.targetX - burstX) * settleProgress;
        const y = burstY + (particle.targetY - burstY) * settleProgress;
        const alpha = Math.min(1, elapsed / 130) * (0.5 + settleProgress * 0.5);
        const radius = particle.radius + mergeProgress * 2.15;

        context.globalAlpha = alpha;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      if (!formationReported && elapsed >= 2200) {
        formationReported = true;
        onFormedRef.current();
      }
      if (elapsed < 3200) animationFrame = window.requestAnimationFrame(draw);
    };

    animationFrame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [active]);

  return <canvas ref={canvasRef} className={`startup-particle-canvas ${active ? 'startup-particle-canvas-active' : ''} ${formed ? 'startup-particle-canvas-merged' : ''}`} aria-hidden="true" />;
}

export function StartupSequence() {
  const startupAudioRef = useRef<HTMLAudioElement | null>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [activated, setActivated] = useState(false);
  const [formed, setFormed] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const audio = new Audio(`${BASE_PATH}/audio/startup-humordome.mp3`);
    audio.preload = 'auto';
    audio.volume = 0.28;
    startupAudioRef.current = audio;

    return () => {
      audio.pause();
      startupAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReady(true);
      setVisible(sessionStorage.getItem(STARTUP_SESSION_KEY) !== '1');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!activated) return;
    const finishTimer = window.setTimeout(() => {
      sessionStorage.setItem(STARTUP_SESSION_KEY, '1');
      setFinished(true);
    }, 3650);
    const removeTimer = window.setTimeout(() => setVisible(false), 4250);
    return () => {
      window.clearTimeout(finishTimer);
      window.clearTimeout(removeTimer);
    };
  }, [activated]);

  if (!ready || !visible) return null;

  const skip = () => {
    startupAudioRef.current?.pause();
    sessionStorage.setItem(STARTUP_SESSION_KEY, '1');
    setVisible(false);
  };

  const activate = () => {
    const audio = startupAudioRef.current;
    if (audio) {
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // The intro starts from a click, but keep the animation usable if audio is blocked.
      });
    }
    setActivated(true);
  };

  return (
    <div className={`startup-shell ${finished ? 'startup-shell-finished' : ''}`} role="dialog" aria-label="Relay introduction">
      <button type="button" onClick={skip} className="absolute right-5 top-5 z-20 text-xs text-white/60 underline underline-offset-4 transition-colors hover:text-white">
        Skip intro
      </button>
      <button
        type="button"
        aria-label="Start Relay intro"
        data-relay-sound="none"
        disabled={activated}
        onClick={activate}
        className="absolute inset-0 z-10 flex items-center justify-center disabled:cursor-default"
      >
        <span className={`startup-core ${activated ? 'startup-core-active' : ''}`}>
          <span className="startup-orbit startup-orbit-one" />
          <span className="startup-orbit startup-orbit-two" />
          <span className="startup-dot" />
          {!activated && <span className="startup-prompt">tap to begin</span>}
        </span>
      </button>
      <ParticleWordmark active={activated} formed={formed} onFormed={() => setFormed(true)} />
      <div className={`startup-copy ${formed ? 'startup-copy-formed' : ''}`} aria-hidden={!formed}>
        <div className="startup-brand-lockup">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE_PATH}/relay-icon.svg`} alt="" className="startup-brand-icon invert" />
          <span className="startup-copy-title">Relay</span>
        </div>
        <p className="startup-welcome">welcome.</p>
      </div>
    </div>
  );
}
