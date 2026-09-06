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
    description: 'Chats, tasks, plans, email, and calendars in one place.',
    start_url: root,
    scope: root,
    display: 'standalone',
    background_color: '#0a0a0b',
    theme_color: '#0a0a0b',
    icons: [{ src: `${BASE_PATH}/relay-icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }],
  };
}
