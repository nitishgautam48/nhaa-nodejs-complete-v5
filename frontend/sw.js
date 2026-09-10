// ================================================================
//  MINIMAL SERVICE WORKER - required for PWA installability (and so
//  the Share Target in manifest.json actually works on Android/
//  Chrome, which only offers a site as a share target once it's
//  installed as a PWA). Deliberately does no offline caching - this
//  app always needs a live connection to the backend anyway, so
//  caching pages/API responses would only risk showing stale case
//  data. Every request just passes straight through to the network.
// ================================================================

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
