// Service worker de Dis-moi. Modèle : scripts/vite-plugin-sw.ts remplace les deux constantes au build.
/* global __PRECACHE__ */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `dis-moi-${VERSION}`;

// Mise en cache de toute l'appli (code, polices, icônes) : elle marche ensuite sans réseau.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

// Nouvelle version : elle attend que le parent appuie sur « Mettre à jour ».
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('dis-moi-') && k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Routeur par hash : toute navigation sert index.html.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreVary: true }).then((cached) => cached ?? fetch(request)),
    );
    return;
  }

  // ignoreVary : les scripts « crossorigin » envoient Origin et le serveur répond « Vary: Origin ».
  event.respondWith(
    caches
      .match(request, { ignoreSearch: true, ignoreVary: true })
      .then(
        (cached) =>
          cached ??
          fetch(request).catch(() => new Response('', { status: 504, statusText: 'Hors ligne' })),
      ),
  );
});
