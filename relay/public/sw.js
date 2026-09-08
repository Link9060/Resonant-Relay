const CACHE = 'relay-shell-v3';
const SCOPE_URL = new URL(self.registration.scope);
const BASE = SCOPE_URL.pathname.replace(/\/$/, '');
const ROOT = `${BASE}/`;
const SHELL = [ROOT, `${BASE}/offline/`, `${BASE}/manifest.webmanifest`, `${BASE}/relay-icon.svg`];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('relay-shell-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(ROOT)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match(`${BASE}/offline/`))));
    return;
  }

  if (['script', 'style', 'image', 'font', 'audio'].includes(request.destination)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
  }
});

function scopedLink(rawLink) {
  if (!rawLink) return ROOT;
  try {
    const parsed = new URL(rawLink, self.location.origin);
    if (parsed.origin !== self.location.origin) return ROOT;
    if (!BASE || parsed.pathname.startsWith(ROOT)) return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return `${BASE}${parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`}${parsed.search}${parsed.hash}`;
  } catch {
    return ROOT;
  }
}

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'Relay', body: '', link: ROOT };
  try { payload = { ...payload, ...event.data.json() }; } catch { payload.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.id || undefined,
    renotify: Boolean(payload.id),
    icon: `${BASE}/relay-icon.svg`,
    badge: `${BASE}/relay-icon.svg`,
    data: { link: scopedLink(payload.link) },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = new URL(scopedLink(event.notification.data?.link), self.location.origin).toString();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if ('focus' in client) {
        client.navigate(link);
        return client.focus();
      }
    }
    return self.clients.openWindow?.(link);
  }));
});
