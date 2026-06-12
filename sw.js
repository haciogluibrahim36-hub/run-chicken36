const CACHE_NAME = 'run-chicken-v2';
const ASSETS_TO_CACHE = [
  '/run-chicken36/',
  '/run-chicken36/index.html',
  '/run-chicken36/manifest.json',
  '/run-chicken36/app-icon.png'
];

// Install - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses or non-GET requests
        if (!response || response.status !== 200 || event.request.method !== 'GET') {
          return response;
        }
        // Clone and cache
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Offline fallback - return cached index for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/run-chicken36/index.html');
        }
      });
    })
  );
});

// Notification click - focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/run-chicken36/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/run-chicken36/');
      }
    })
  );
});

// Periodic background sync - reminder notifications (Chrome on Android)
const REMINDER_MESSAGES = [
  { title: '🐔 Your chicken misses you!', body: 'Come back and master more corridors!' },
  { title: '🥚 Eggs are waiting!', body: 'Hatch new chicks today.' },
  { title: '🏆 Beat your best level?', body: 'A new challenge awaits!' }
];

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'reminder') {
    event.waitUntil(showReminder());
  }
});

// Push event handler (for future server-side push, optional)
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const msg = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
  event.waitUntil(
    self.registration.showNotification(data.title || msg.title, {
      body: data.body || msg.body,
      icon: '/run-chicken36/app-icon.png',
      badge: '/run-chicken36/app-icon.png',
      tag: 'run-chicken-reminder'
    })
  );
});

function showReminder() {
  const msg = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
  return self.registration.showNotification(msg.title, {
    body: msg.body,
    icon: '/run-chicken36/app-icon.png',
    badge: '/run-chicken36/app-icon.png',
    tag: 'run-chicken-reminder'
  });
}
