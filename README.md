# Dis-moi

Application Android (PWA) de jeux pour enfants, **menés par un parent**.

Le parent tient le téléphone et pose les questions, l'enfant répond à voix haute.
Pas de compte, pas de publicité, pas de suivi : un moment de jeu partagé.

## Jeux prévus

| Jeu                               | Principe                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Quelle chanson ?**              | Un extrait de 10 s est joué, l'enfant devine la chanson. Le parent voit la réponse et un indice.                                   |
| **Quelle lettre, quel chiffre ?** | Une lettre ou un chiffre s'affiche en grand, le parent a une consigne associée.                                                    |
| **Dessine ça**                    | Le parent lit un mot, l'enfant le dessine au doigt sur l'écran, avec un minuteur.                                                  |
| **Le Grand Jeu**                  | Chaque manche, un jeu différent de l'accueil, annoncé par un écran-éclair (« Maintenant : Mime ça ! »).                            |
| **Respire comme…**                | Respiration guidée en images pour se calmer : une forme grossit, rapetisse, une étoile à la fin.                                   |
| **Ajouter un jeu**                | Catalogue de jeux supplémentaires (animaux, couleurs, mime, devinettes, émotions, chasse au trésor) ou création de son propre jeu. |

Chaque partie se joue en manches ; les bonnes réponses rapportent des **étoiles** gagnées ensemble.

## Démarrer

Prérequis : Node 22 (voir `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:phone    # accessible depuis un téléphone sur le même Wi-Fi
```

Sur le téléphone Android, ouvrir dans Chrome l'adresse « Network » affichée par `npm run dev:phone`.

## Mise en ligne

L'appli publiée : **https://mazyad-ahmad.github.io/dis-moi/** (HTTPS, nécessaire au service worker).
L'ouvrir dans Chrome sur Android, puis « Installer l'appli » dans l'espace Parent ; elle marche ensuite en mode avion.

- Chaque fusion dans `main` publie l'appli, une fois la CI verte (job `deploy` de `.github/workflows/ci.yml`).
  Les téléphones où elle est installée voient alors le bandeau « Mettre à jour ».
- Chaque PR a sa prévisualisation dans `…/dis-moi/pr/<numéro>/`, dont le lien est posté en commentaire de la PR.
  Elle est retirée quand la PR est fusionnée ou fermée (`.github/workflows/preview-cleanup.yml`).
- Le site est la branche `gh-pages`, écrite par `scripts/publish-pages.sh` (un seul commit, réécrit à chaque publication).
  Réglage unique du dépôt : _Settings → Pages → Source : Deploy from a branch_, branche `gh-pages`, dossier `/ (root)`.
- Le service worker ne s'occupe que de son dossier : une prévisualisation n'efface pas le cache de l'appli
  installée, et l'appli installée ne remplace pas la page d'une prévisualisation.

| Commande                          | Rôle                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run build`                   | Build de production dans `dist/`                                                                               |
| `npm run preview`                 | Sert le build localement                                                                                       |
| `npm test`                        | Tests unitaires (Vitest)                                                                                       |
| `npm run e2e`                     | Tests de bout en bout sur un mobile simulé (Playwright) ; la première fois : `npx playwright install chromium` |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                                                              |
| `npm run tokens`                  | Régénère `src/styles/tokens.css` depuis les tokens de la maquette                                              |
| `node scripts/gen-icons.mjs`      | Régénère les icônes PNG de l'appli (`public/icon-*.png`) depuis le logo                                        |

La CI GitHub Actions lance lint, format, types, tests, build et e2e à chaque PR, et publie le build (`dist`) en artefact.

## Organisation du code

```
src/
  app/          routeur (hash) et composition des écrans
  audio/        contexte audio partagé (plafond, volume), sons d'interface, enregistrements du parent
  components/   composants du design system (Button, Card, ParentBlock, GameHeader, BottomNav…)
  data/         base locale IndexedDB (Dexie) : joueurs, réglages, parties, jeux créés, médias
  pwa/          service worker (enregistrement, mise à jour), installation, Wake Lock
  games/        jeux : moteur de manches commun, chanson/, lettres/, dessin/,
                deck/ (format commun des jeux à cartes), catalogue/
  screens/      écrans
  styles/       tokens générés + styles globaux
e2e/            tests Playwright
```

Toutes les données restent sur l'appareil (IndexedDB), sans compte ni serveur.
Détail pour les familles : page « Confidentialité » de l'espace Parent (`src/screens/Privacy.tsx`).

## Appli installable et hors ligne

- `public/manifest.webmanifest` : nom, icônes (dont une « maskable » pour Android), plein écran, portrait.
- Service worker (`scripts/sw.js`, complété au build par `scripts/vite-plugin-sw.ts`) : met en cache tout le build
  (code, polices, icônes). Sa version change dès qu'un fichier change. Il n'est enregistré que sur le build, pas avec `npm run dev`.
- Mise à jour : la nouvelle version attend ; un bandeau « Mettre à jour » la propose, jamais de rechargement en pleine partie.
- Installation : bouton « Installer l'appli » dans l'espace Parent quand Chrome le propose, sinon la marche à suivre.
- Pendant une partie, l'écran reste allumé (Wake Lock), puis se remet en veille normalement.
- Les tests e2e tournent sur le build servi sous `/dis-moi/`, comme en ligne. Ils vérifient le manifest, le jeu hors ligne, l'absence de requête vers un autre site et un audit
  d'accessibilité axe (WCAG 2.1 AA) de chaque écran en thème jour et nuit.

## Maquette

La maquette interactive se trouve dans [`docs/maquette`](docs/maquette) :

```bash
cd docs/maquette
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/Main.dc.html
```

Écrans : `Main` (accueil), `Musique`, `Image`, `Dessine`, `Ajouter`.
Les design tokens (thème « Cadmus », jour / nuit) sont dans `docs/maquette/ds/cadmus/tokens.json`.

## Documentation

- [Fonctionnement de l'application](docs/FONCTIONNEMENT.md)
- [Packs de contenu des jeux](docs/PACKS.md) : ajouter des cartes sans toucher au code

## Avancement

Le suivi se fait dans les [issues GitHub](../../issues), regroupées par jalons.
