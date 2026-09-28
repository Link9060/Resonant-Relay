import type { MetadataRoute } from 'next';
import { APP_VERSION, BASE_PATH, IS_BETA } from '@/lib/config';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  const name = IS_BETA ? `Relay Beta ${APP_VERSION}` : `Relay ${APP_VERSION}`;
  const shortName = IS_BETA ? 'Relay Beta' : 'Relay';
  const root = `${BASE_PATH}/`;

  return {
    name,
    short_name: shortName,
    description: 'Chats, tasks, plans, notes, and calendars in one place.',
    start_url: root,
    scope: root,
    display: 'standalone',
    background_color: '#0a0a0b',
    theme_color: '#0a0a0b',
    icons: [
      { src: `${BASE_PATH}/relay-icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${BASE_PATH}/relay-icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${BASE_PATH}/relay-icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
