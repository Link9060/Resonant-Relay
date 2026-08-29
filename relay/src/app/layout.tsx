import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const body = Inter({ subsets: ['latin'], variable: '--font-body' });
// Space Grotesk's geometric numerals are why it's the display face — Relay
// Numbers, dates, and headings all lean on it as the one typographic accent.
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Relay',
  description: 'The place you open to figure out your day.',
};

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
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-body">{children}</body>
    </html>
  );
}
