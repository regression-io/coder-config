// Service Worker for Coder Config PWA
// Minimal SW - no caching, just enables PWA install

// Install - skip waiting to activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate - claim clients and clear any old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - always use network, no caching
self.addEventListener('fetch', () => {
  // Let all requests pass through to network
  return;
});
