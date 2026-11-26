// Service worker de Dis-moi. Modèle : scripts/vite-plugin-sw.ts remplace les deux constantes au build.
/* global __PRECACHE__ */
const VERSION = "ba30278d710f";
const PRECACHE = [
  "./apple-touch-icon.png",
  "./assets/figtree-latin-400-normal-g7Dtegnw.woff2",
  "./assets/figtree-latin-600-normal-Cv_xCTDl.woff2",
  "./assets/figtree-latin-700-normal-th6qEP7c.woff2",
  "./assets/figtree-latin-ext-400-normal-CXAzuTZb.woff2",
  "./assets/figtree-latin-ext-600-normal-DJlfifZj.woff2",
  "./assets/figtree-latin-ext-700-normal-CS4sQkGV.woff2",
  "./assets/fraunces-latin-500-normal-DnGCNyPD.woff2",
  "./assets/fraunces-latin-600-normal-BFCDtZfi.woff2",
  "./assets/fraunces-latin-ext-500-normal-Z5DV8IzT.woff2",
  "./assets/fraunces-latin-ext-600-normal-BtzmzP0X.woff2",
  "./assets/fraunces-vietnamese-500-normal-GOH_-EGq.woff2",
  "./assets/fraunces-vietnamese-600-normal-BjlAJixd.woff2",
  "./assets/index-Be8T8-HD.js",
  "./assets/index-DR15Mpkr.css",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./",
  "./index.html",
  "./logo.svg",
  "./manifest.webmanifest"
];
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
