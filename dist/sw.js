// MORIARTY V0.3 — caché para uso sin conexión. Cambiar CACHE al publicar una versión nueva.
const CACHE = 'moriarty-v03-1';
const FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './model.js',
  './library.js',
  './library-view.js',
  './icons.js',
  './media.js',
  './manifest.webmanifest',
  './icon.svg',
  './fonts/literata.woff',
  './fonts/literata-italic.woff',
  './fonts/inter.woff',
];
self.addEventListener('install', (e) =>
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('moriarty-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);
// Red primero para el código (así las actualizaciones llegan); caché primero para fuentes.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  const isFont = e.request.url.includes('/fonts/');
  e.respondWith(
    isFont
      ? caches.match(e.request).then((r) => r || fetch(e.request))
      : fetch(e.request)
          .then((r) => {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return r;
          })
          .catch(() =>
            caches.match(e.request).then((r) => r || new Response('Sin conexión y recurso no disponible', {status: 503})),
          ),
  );
});
