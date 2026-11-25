// Service worker de Dis-moi. Modèle : scripts/vite-plugin-sw.ts remplace les deux constantes au build.
/* global __PRECACHE__ */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
// Dossier de l'appli (« /dis-moi/ », « /dis-moi/pr/12/ »…). Plusieurs copies de l'appli
// partagent le même site (version publiée et prévisualisations) : chacune a ses caches
// et ne répond qu'aux pages de son propre dossier.
const SCOPE = new URL(self.registration.scope).pathname;
const PREFIX = `dis-moi:${SCOPE}:`;
const CACHE = `${PREFIX}${VERSION}`;

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
          keys
            // Anciennes versions de ce dossier, et caches d'avant le rangement par dossier.
            .filter((k) => (k.startsWith(PREFIX) && k !== CACHE) || /^dis-moi-[0-9a-f]+$/.test(k))
            .map((k) => caches.delete(k)),
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

  // Routeur par hash : toute navigation vers le dossier de l'appli sert index.html.
  // Les autres pages (une prévisualisation dans un sous-dossier) partent au réseau.
  if (request.mode === 'navigate') {
    if (url.pathname !== SCOPE && url.pathname !== `${SCOPE}index.html`) return;
    event.respondWith(
      caches
        .open(CACHE)
        .then((cache) => cache.match('./index.html', { ignoreVary: true }))
        .then((cached) => cached ?? fetch(request)),
    );
    return;
  }

  // ignoreVary : les scripts « crossorigin » envoient Origin et le serveur répond « Vary: Origin ».
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(request, { ignoreSearch: true, ignoreVary: true }))
      .then(
        (cached) =>
          cached ??
          fetch(request).catch(() => new Response('', { status: 504, statusText: 'Hors ligne' })),
      ),
  );
});
