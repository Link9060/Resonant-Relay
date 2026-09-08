import type { Metadata, Viewport } from 'next';
import './globals.css';
import './brand.css';
import './mobile.css';
import './beta-experience.css';
import { BetaIntro } from '@/components/beta-intro';
import { StartupSequence } from '@/components/startup-sequence';
import { UiSoundEffects } from '@/components/ui-sound-effects';
import { PwaRegister } from '@/components/pwa-register';
import { APP_TITLE, BASE_PATH, IS_BETA } from '@/lib/config';

export const metadata: Metadata = {
  title: APP_TITLE,
  description: IS_BETA
    ? 'Relay Beta — the place you open to figure out your day.'
    : 'The place you open to figure out your day.',
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: IS_BETA ? 'Relay Beta' : 'Relay', statusBarStyle: 'black-translucent' },
  icons: { icon: `${BASE_PATH}/relay-icon.svg`, apple: `${BASE_PATH}/relay-icon.svg` },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('relay-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-body"><PwaRegister /><UiSoundEffects />{IS_BETA ? <BetaIntro /> : <StartupSequence />}{children}</body>
    </html>
  );
}
