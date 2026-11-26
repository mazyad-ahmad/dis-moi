// Service worker de Dis-moi. Modèle : scripts/vite-plugin-sw.ts remplace les deux constantes au build.
/* global __PRECACHE__ */
const VERSION = "5f1625d485f0";
const PRECACHE = [
  "./apple-touch-icon.png",
  "./assets/abeille-C7K-szKZ.wav",
  "./assets/abeille-DxiF7AoD.webp",
  "./assets/ane-Dtt2rbEe.wav",
  "./assets/ane-EL7bYItT.webp",
  "./assets/baleine-Cq66jLs6.wav",
  "./assets/baleine-D_rxdTOM.webp",
  "./assets/canard-BfbIhva1.wav",
  "./assets/canard-CB8Czfco.webp",
  "./assets/cerf-C65sLmEV.webp",
  "./assets/cerf-DEFgqVHL.wav",
  "./assets/chameau-BldD6ks5.webp",
  "./assets/chameau-SqAvK6Wi.wav",
  "./assets/chat-Dz9kTyaH.webp",
  "./assets/chat-Ns6dn3Vz.wav",
  "./assets/cheval-CjVWuCMe.wav",
  "./assets/cheval-Datsafwq.webp",
  "./assets/chevre-CyZZC7CC.wav",
  "./assets/chevre-DIywLjgR.webp",
  "./assets/chien-B9M9rC7E.webp",
  "./assets/chien-DdmfnVmf.wav",
  "./assets/cochon-PsEquO5_.wav",
  "./assets/cochon-UNvXhU3O.webp",
  "./assets/coq-BgZQA1_5.webp",
  "./assets/coq-Dzdrgskf.wav",
  "./assets/corbeau-DHb3UGYI.webp",
  "./assets/corbeau-DK121VF7.wav",
  "./assets/dauphin-BvLRNUIy.webp",
  "./assets/dauphin-DBYaZzcA.wav",
  "./assets/dindon-BFu1o5M1.webp",
  "./assets/dindon-BLoy1V50.wav",
  "./assets/elephant-BqRz0DN0.webp",
  "./assets/elephant-RjAPLkVN.wav",
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
  "./assets/grenouille-BFEwIaT6.wav",
  "./assets/grenouille-Bx_wp6Px.webp",
  "./assets/grillon-C7SH9vMH.webp",
  "./assets/grillon-z4GiaL7x.wav",
  "./assets/herisson-B-NAh5nn.wav",
  "./assets/herisson-C3CRhzzr.webp",
  "./assets/hibou-XOntEpZr.wav",
  "./assets/hibou-qgzJtgYD.webp",
  "./assets/hippopotame-92VwYJZ6.wav",
  "./assets/hippopotame-CQCxhEew.webp",
  "./assets/index-CRFft4yI.js",
  "./assets/index-DfDjmpnh.css",
  "./assets/lion-BDAYVXpv.wav",
  "./assets/lion-C92nfy5r.webp",
  "./assets/loup-DKcAbjzN.wav",
  "./assets/loup-GKcZpRya.webp",
  "./assets/manchot-B6nmZIh6.webp",
  "./assets/manchot-DLXs4pzG.wav",
  "./assets/moustique-BCr3FdkG.webp",
  "./assets/moustique-Bp4T-mq3.wav",
  "./assets/mouton-C-5xH9s7.wav",
  "./assets/mouton-wgAExAWA.webp",
  "./assets/oie-2QhGvH68.webp",
  "./assets/oie-DYoCqRi_.wav",
  "./assets/oiseau-6Je-yYXE.wav",
  "./assets/oiseau-DeuXLPWW.webp",
  "./assets/ours-Bi9ck75M.wav",
  "./assets/ours-x3MgOQ-6.webp",
  "./assets/paon-D0q-bjrX.webp",
  "./assets/paon-DfHFTr1g.wav",
  "./assets/perroquet-CEU4Mps6.webp",
  "./assets/perroquet-DjVrZpid.wav",
  "./assets/phoque-D3RQpjpR.webp",
  "./assets/phoque-Dzdh9FMv.wav",
  "./assets/pigeon-BA_pipJF.webp",
  "./assets/pigeon-Ck9O4RqR.wav",
  "./assets/playwrite-fr-moderne-latin-400-normal-Hrzkzxmx.woff2",
  "./assets/poule-Bz3WxUOn.wav",
  "./assets/poule-n4kJYrwH.webp",
  "./assets/poussin-D2Os-Uvc.wav",
  "./assets/poussin-D5DDFESe.webp",
  "./assets/serpent-W6_fTCMU.webp",
  "./assets/serpent-i30Ze0gN.wav",
  "./assets/singe-CWcSoFXk.wav",
  "./assets/singe-D_v8V-ad.webp",
  "./assets/souris-BT-73hbR.webp",
  "./assets/souris-rTRhuo26.wav",
  "./assets/tigre-BhAstWfi.webp",
  "./assets/tigre-DOMFd-hE.wav",
  "./assets/vache-Bw32By8i.webp",
  "./assets/vache-ChwtkLFw.wav",
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
