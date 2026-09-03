import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Relay', short_name: 'Relay', description: 'Chats, tasks, plans, email, and calendars in one place.', start_url: '/Resonant-Relay/', scope: '/Resonant-Relay/', display: 'standalone', background_color: '#0a0a0b', theme_color: '#0a0a0b', icons: [{ src: '/Resonant-Relay/relay-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }] };
}
