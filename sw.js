/* Site Photos service worker — full offline.
   Bump CACHE_VERSION whenever you change index.html or the icons, so phones
   pull the new version instead of serving the old cached one. */
const CACHE_VERSION = 'site-photos-v1';

// Everything the app needs to boot with no network. index.html already has the
// JS libraries (pdf.js, pdf-lib, JSZip, FileSaver) bundled inside it, so the
// shell is just these few files.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
    // Note: no skipWaiting() here. The new worker waits until the user taps
    // "Refresh" in the update bar, which posts SKIP_WAITING (handled below).
  );
});

// The page asks the waiting worker to take over when the user taps Refresh.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET; let everything else go straight to the network.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resp) => {
          // Cache same-origin successful responses for next time (offline).
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => {
          // Offline and not cached: fall back to the app shell for navigations.
          if (event.request.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
