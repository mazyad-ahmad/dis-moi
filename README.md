# Dis-moi

Application Android (PWA) de jeux pour enfants, **menés par un parent**.

Le parent tient le téléphone et pose les questions, l'enfant répond à voix haute.
Pas de compte, pas de publicité, pas de suivi : un moment de jeu partagé.

## Jeux prévus

| Jeu | Principe |
| --- | --- |
| **Quelle chanson ?** | Un extrait de 10 s est joué, l'enfant devine la chanson. Le parent voit la réponse et un indice. |
| **Quelle lettre, quel chiffre ?** | Une lettre ou un chiffre s'affiche en grand, le parent a une consigne associée. |
| **Dessine ça** | Le parent lit un mot, l'enfant le dessine au doigt sur l'écran, avec un minuteur. |
| **Ajouter un jeu** | Catalogue de jeux supplémentaires (animaux, couleurs, mime, devinettes) ou création de son propre jeu. |

Chaque partie se joue en manches ; les bonnes réponses rapportent des **étoiles** gagnées ensemble.

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
