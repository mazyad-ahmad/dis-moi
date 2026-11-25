# Dis-moi

Application Android (PWA) de jeux pour enfants, **menés par un parent**.

Le parent tient le téléphone et pose les questions, l'enfant répond à voix haute.
Pas de compte, pas de publicité, pas de suivi : un moment de jeu partagé.

## Jeux prévus

| Jeu                               | Principe                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Quelle chanson ?**              | Un extrait de 10 s est joué, l'enfant devine la chanson. Le parent voit la réponse et un indice.       |
| **Quelle lettre, quel chiffre ?** | Une lettre ou un chiffre s'affiche en grand, le parent a une consigne associée.                        |
| **Dessine ça**                    | Le parent lit un mot, l'enfant le dessine au doigt sur l'écran, avec un minuteur.                      |
| **Ajouter un jeu**                | Catalogue de jeux supplémentaires (animaux, couleurs, mime, devinettes) ou création de son propre jeu. |

Chaque partie se joue en manches ; les bonnes réponses rapportent des **étoiles** gagnées ensemble.

## Démarrer

Prérequis : Node 22 (voir `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:phone    # accessible depuis un téléphone sur le même Wi-Fi
```

Sur le téléphone Android, ouvrir dans Chrome l'adresse « Network » affichée par `npm run dev:phone`.

| Commande                          | Rôle                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run build`                   | Build de production dans `dist/`                                                                               |
| `npm run preview`                 | Sert le build localement                                                                                       |
| `npm test`                        | Tests unitaires (Vitest)                                                                                       |
| `npm run e2e`                     | Tests de bout en bout sur un mobile simulé (Playwright) ; la première fois : `npx playwright install chromium` |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                                                              |
| `npm run tokens`                  | Régénère `src/styles/tokens.css` depuis les tokens de la maquette                                              |

La CI GitHub Actions lance lint, format, types, tests, build et e2e à chaque PR, et publie le build (`dist`) en artefact.

## Organisation du code

```
src/
  app/          routeur (hash) et composition des écrans
  components/   composants du design system (Button, Card, ParentBlock, GameHeader, BottomNav…)
  data/         base locale IndexedDB (Dexie) : joueurs, réglages, parties, jeux créés, médias
  games/        jeux : moteur de manches commun, chanson/, lettres/, dessin/,
                deck/ (format commun des jeux à cartes), catalogue/
  screens/      écrans
  styles/       tokens générés + styles globaux
e2e/            tests Playwright
```

Toutes les données restent sur l'appareil (IndexedDB), sans compte ni serveur.

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

## Avancement

Le suivi se fait dans les [issues GitHub](../../issues), regroupées par jalons.
