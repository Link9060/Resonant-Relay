const CACHE = 'relay-shell-v4';
const SCOPE_URL = new URL(self.registration.scope);
const BASE = SCOPE_URL.pathname.replace(/\/$/, '');

function appPath(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (BASE && (normalized === BASE || normalized.startsWith(`${BASE}/`))) return normalized;
  return `${BASE}${normalized}` || '/';
}

const SHELL = [appPath('/'), appPath('/offline/'), appPath('/manifest.webmanifest'), appPath('/relay-icon.svg')];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('relay-shell-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const insideScope = BASE ? url.pathname === BASE || url.pathname.startsWith(`${BASE}/`) : true;
  if (url.origin !== self.location.origin || !insideScope) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) void caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(appPath('/offline/')))),
    );
    return;
  }

  if (['script', 'style', 'image', 'font', 'audio'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) void caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      })),
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'Relay', body: '', link: appPath('/') };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.id || undefined,
    renotify: Boolean(payload.id),
    silent: false,
    icon: appPath('/relay-icon.svg'),
    badge: appPath('/relay-icon.svg'),
    data: { link: payload.link || appPath('/') },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawLink = event.notification.data?.link || '/';
  let targetPath = appPath('/');

  try {
    const candidate = new URL(rawLink, self.location.origin);
    if (candidate.origin === self.location.origin) {
      const pathWithSuffix = `${candidate.pathname}${candidate.search}${candidate.hash}`;
      const alreadyScoped = BASE && (candidate.pathname === BASE || candidate.pathname.startsWith(`${BASE}/`));
      targetPath = alreadyScoped ? pathWithSuffix : appPath(pathWithSuffix);
    }
  } catch {
    targetPath = appPath('/');
  }

  const link = new URL(targetPath, self.location.origin).toString();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          void client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow?.(link);
    }),
  );
});
