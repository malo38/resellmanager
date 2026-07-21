// Service worker minimal pour les notifications Web Push (nouvelle vente,
// nouveau favori). Ne fait aucun cache/offline — uniquement l'écoute des
// événements push envoyés par le backend (voir POST /api/push/notify).
self.addEventListener('push', (event) => {
  let payload = { title: 'VintControl', body: '' };
  try { payload = event.data.json(); } catch (e) { /* payload non-JSON, ignoré */ }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'VintControl', {
      body: payload.body || '',
      icon: '/img/favicon-192.png',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
