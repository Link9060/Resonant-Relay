import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-body">{children}</body>
    </html>
  );
}
