import type { Metadata, Viewport } from 'next';
import './globals.css';
import './brand.css';
import './mobile.css';
import './beta-experience.css';
import { BetaIntro } from '@/components/beta-intro';
import { ExperienceProvider } from '@/components/experience-provider';
import { UiSoundEffects } from '@/components/ui-sound-effects';
import { PwaRegister } from '@/components/pwa-register';
import { APP_TITLE, BASE_PATH, IS_BETA } from '@/lib/config';

export const metadata: Metadata = { title: APP_TITLE, description: IS_BETA ? 'Relay Beta — the place you open to figure out your day.' : 'The place you open to figure out your day.', manifest: `${BASE_PATH}/manifest.webmanifest`, appleWebApp: { capable: true, title: IS_BETA ? 'Relay Beta' : 'Relay', statusBarStyle: 'black-translucent' }, icons: { icon: `${BASE_PATH}/relay-icon.svg`, apple: `${BASE_PATH}/relay-icon.svg` } };
export const viewport: Viewport = { themeColor: '#0a0a0b', viewportFit: 'cover', width: 'device-width', initialScale: 1 };

const themeInitScript = `(function(){try{var stored=localStorage.getItem('relay-theme');var theme=stored||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',theme==='dark');var ex=localStorage.getItem('relay-experience-mode')||'relay';var pal=localStorage.getItem('relay-experience-palette')||'monochrome';var intensity=Number(localStorage.getItem('relay-experience-intensity')||55);document.documentElement.dataset.relayExperience=ex;document.documentElement.dataset.relayPalette=pal;document.documentElement.style.setProperty('--relay-experience-intensity',String(Math.max(0,Math.min(100,intensity))/100));}catch(e){}})();`;
const emergencyLauncherStyle = { position: 'fixed' as const, right: 'max(14px, env(safe-area-inset-right))', bottom: 'max(14px, env(safe-area-inset-bottom))', zIndex: 2147483647, display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 999, border: '1px solid rgba(168, 48, 48, 0.72)', background: 'rgba(31, 4, 4, 0.94)', color: '#ef7777', boxShadow: '0 0 0 1px rgba(255,255,255,0.025), 0 8px 28px rgba(80,0,0,0.35)', textDecoration: 'none', fontSize: 17, fontWeight: 800, lineHeight: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head><body className="font-body"><ExperienceProvider><PwaRegister /><UiSoundEffects /><BetaIntro />{children}<a href={`${BASE_PATH}/emergency/index.html`} aria-label="Open Relay Emergency Mode" title="Relay Emergency Mode" style={emergencyLauncherStyle}>!</a></ExperienceProvider></body></html>;
}
