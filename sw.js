// Libreta sin conexión: la app se guarda al instalarla y se sirve desde aquí. Las fuentes de Google
// se guardan la primera vez que se usan. Al publicar una versión nueva cambia VERSION y la app
// avisa («Hay una versión nueva») en lugar de recargarse sola a mitad de lo que estés haciendo.
const VERSION = '20261015201643';
const CACHE = `libreta-${VERSION}`;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './icon-180.png',
  './vendor/jspdf.umd.min.js', './vendor/html2canvas.min.js', './vendor/pdf.min.js', './vendor/pdf.worker.min.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('libreta-') && key !== CACHE && key !== 'libreta-fonts') await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  // Fuentes: de la caché si están; si no, de la red y se guardan.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open('libreta-fonts');
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const response = await fetch(event.request);
      cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }
  if (url.origin !== location.origin) return;
  // La app: primero lo guardado (funciona sin conexión), si no, la red.
  event.respondWith((async () => {
    const hit = await caches.match(event.request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(event.request);
    } catch (e) {
      if (event.request.mode === 'navigate') return caches.match('./index.html');
      throw e;
    }
  })());
});
