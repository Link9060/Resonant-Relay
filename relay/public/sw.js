// Relay's service worker. Its only job is turning a Web Push message into a
// native OS notification (this is what makes it show up in, e.g., macOS
// Notification Center rather than only inside the Relay tab) and routing a
// click back into the app.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = { title: 'Relay', body: '', link: '/Resonant-Relay/' };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { link: payload.link || '/Resonant-Relay/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawLink = event.notification.data?.link || '/';
  const link = rawLink.startsWith('/Resonant-Relay/') ? rawLink : `/Resonant-Relay${rawLink}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(link);
      }
    })
  );
});
