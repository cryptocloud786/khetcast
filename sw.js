// Offline shell: cache the app files; forecasts are always fetched live
// (the app itself keeps the last plan in localStorage for offline use).
const CACHE = 'khetcast-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'icon.svg', 'manifest.webmanifest',
  'src/app.js', 'src/engine.js', 'src/weather.js', 'src/i18n.js', 'src/ask.js'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // network only for APIs
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request)));
});
