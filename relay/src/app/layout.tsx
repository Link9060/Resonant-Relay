import type { Metadata, Viewport } from 'next';
import './globals.css';
import './brand.css';
import { StartupSequence } from '@/components/startup-sequence';
import { UiSoundEffects } from '@/components/ui-sound-effects';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'Relay',
  description: 'The place you open to figure out your day.',
  manifest: '/Resonant-Relay/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Relay', statusBarStyle: 'black-translucent' },
  icons: { icon: '/Resonant-Relay/relay-icon.svg', apple: '/Resonant-Relay/relay-icon.svg' },
};

export const viewport: Viewport = { themeColor: '#0a0a0b' };

// Applies the saved theme before paint so there's no light-mode flash
// for users who prefer dark (and vice versa).
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
      <body className="font-body"><PwaRegister /><UiSoundEffects /><StartupSequence />{children}</body>
    </html>
  );
}
