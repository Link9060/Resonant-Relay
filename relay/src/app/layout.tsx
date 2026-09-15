import type { Metadata, Viewport } from 'next';
import './globals.css';
import './brand.css';
import './mobile.css';
import './beta-experience.css';
import './experience.css';
import './experience-polish.css';
import './vivid-experience.css';
import './vivid-single-hue.css';
import './experience-layout-safety.css';
import './desktop-layouts.css';
import './still-minimal.css';
import './global-shortcuts.css';
import './dashboard-editor.css';
import './dashboard-widgets.css';
import './startup-safety.css';
import { BetaIntro } from '@/components/beta-intro';
import { ExperienceProvider } from '@/components/experience-provider';
import { LayoutProvider } from '@/components/layout-provider';
import { UiSoundEffects } from '@/components/ui-sound-effects';
import { PwaRegister } from '@/components/pwa-register';
import { APP_TITLE, BASE_PATH, IS_BETA } from '@/lib/config';

export const metadata: Metadata = { title: APP_TITLE, description: IS_BETA ? 'Relay Beta — the place you open to figure out your day.' : 'The place you open to figure out your day.', manifest: `${BASE_PATH}/manifest.webmanifest`, appleWebApp: { capable: true, title: IS_BETA ? 'Relay Beta' : 'Relay', statusBarStyle: 'black-translucent' }, icons: { icon: [{ url: `${BASE_PATH}/favicon-32.png`, sizes: '32x32', type: 'image/png' }, { url: `${BASE_PATH}/relay-icon.svg`, sizes: 'any', type: 'image/svg+xml' }], apple: [{ url: `${BASE_PATH}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }] } };
export const viewport: Viewport = { themeColor: '#0a0a0b', viewportFit: 'cover', width: 'device-width', initialScale: 1 };
// Visual choices are account data. Before authentication finishes, never trust
// browser-global layout/experience keys left by a different Relay account.
const themeInitScript = `(function(){try{var stored=localStorage.getItem('relay-theme');var theme=stored||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var root=document.documentElement;root.classList.toggle('dark',theme==='dark');root.dataset.relayExperience='flow';root.dataset.relayPalette='monochrome';root.dataset.relayLockIn='false';root.dataset.relayVisualPrefsReady='false';root.style.setProperty('--relay-experience-intensity','0.55');if(window.matchMedia('(min-width: 768px)').matches){root.dataset.relayLayout='classic';}else{delete root.dataset.relayLayout;}}catch(e){}})();`;
const emergencyLauncherStyle = { position:'fixed' as const,right:'max(14px, env(safe-area-inset-right))',bottom:'max(14px, env(safe-area-inset-bottom))',zIndex:2147483647,display:'grid',placeItems:'center',width:42,height:42,borderRadius:999,border:'1px solid rgba(168, 48, 48, 0.72)',background:'rgba(31, 4, 4, 0.94)',color:'#ef7777',boxShadow:'0 0 0 1px rgba(255,255,255,0.025), 0 8px 28px rgba(80,0,0,0.35)',textDecoration:'none',fontSize:17,fontWeight:800,lineHeight:1 };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeInitScript}}/></head><body className="font-body"><ExperienceProvider><LayoutProvider><PwaRegister/><UiSoundEffects/><BetaIntro/>{children}<a href={`${BASE_PATH}/emergency/index.html`} aria-label="Open Relay Emergency Mode" title="Relay Emergency Mode" style={emergencyLauncherStyle}>!</a></LayoutProvider></ExperienceProvider></body></html>;}
