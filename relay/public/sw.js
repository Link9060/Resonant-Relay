const CACHE = 'relay-shell-v2';
const BASE = '/Resonant-Relay';
const SHELL = [`${BASE}/`, `${BASE}/offline/`, `${BASE}/manifest.webmanifest`, `${BASE}/relay-icon.svg`];

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
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

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

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'Relay', body: '', link: `${BASE}/` };
  try { payload = { ...payload, ...event.data.json() }; } catch { payload.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body, tag: payload.id || undefined, renotify: Boolean(payload.id), icon: `${BASE}/relay-icon.svg`, badge: `${BASE}/relay-icon.svg`, data: { link: payload.link || `${BASE}/` } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawLink = event.notification.data?.link || '/';
  const link = new URL(rawLink.startsWith(`${BASE}/`) ? rawLink : `${BASE}${rawLink}`, self.location.origin).toString();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => { for (const client of clients) { if ('focus' in client) { client.navigate(link); return client.focus(); } } return self.clients.openWindow?.(link); }));
});
