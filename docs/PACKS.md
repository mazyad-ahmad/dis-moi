# Packs de contenu

Le contenu des jeux intégrés (airs, lettres, chiffres, mots à dessiner, jeux du catalogue) est rangé
dans `src/content/`, un fichier JSON par pack. Les packs sont embarqués dans l'appli au build : ils
marchent hors ligne. Le code les lit avec `getPack(id)` (`src/content/packs.ts`).

**Ajouter une carte = ajouter une ligne** dans le tableau `items` du pack, puis augmenter `revision`.
Les tests (`npm test`) vérifient chaque pack et nomment la carte fautive, par exemple :

```
Pack chansons.json : carte 2 (« Au clair de la lune ») : tempo (« bpm ») entre 40 et 240 attendu
```

Les fichiers de `src/content/` ne passent pas par Prettier, pour garder une carte par ligne.

## Format

Le format est celui des fichiers de jeu partagés `.dismoi.json`, avec quelques champs en plus. Un
pack de jeu à cartes s'importe donc tel quel dans « Importer un jeu (fichier) » (50 cartes au plus).

<!-- prettier-ignore -->
```json
{
  "format": "dis-moi/jeu",
  "version": 1,
  "id": "animal",
  "revision": 1,
  "kind": "sound",
  "name": "Quel animal ?",
  "lang": "fr",
  "category": "Animaux",
  "desc": "Le parent imite le cri, l’enfant devine",
  "mark": "Cri",
  "tint": "meadow",
  "items": [
    {"id": "vache", "answer": "La vache", "emoji": "🐄", "text": "Meuh !", "hint": "Elle donne du lait."}
  ]
}
```

| Champ du pack                      | Rôle                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format`, `version`                | `"dis-moi/jeu"` et `1`, comme un fichier de jeu                                                                                                                     |
| `id`                               | identifiant (minuscules, chiffres, tirets) ; fichier `<id>.json`                                                                                                    |
| `revision`                         | révision du contenu, à augmenter à chaque changement de cartes                                                                                                      |
| `kind`                             | `sound`, `image`, `draw`, `question` (jeux à cartes), `melody`, `glyph`                                                                                             |
| `name`, `lang`                     | nom (30 caractères max) et langue (`fr`)                                                                                                                            |
| `category`, `desc`, `mark`, `tint` | jeux du catalogue : fichier `catalogue-<id>.json`, ordre dans `CATALOGUE_PACKS`                                                                                     |
| `moves`                            | facultatif : `true` si le jeu fait bouger l'enfant (mime) ; écarté au Coucher                                                                                       |
| `still`                            | facultatif, avec `moves` : `true` si le jeu a une version sans bouger (chasse au trésor), jouée au Coucher et en Voiture                                            |
| `activities`, `skill`              | jeux du catalogue : types (`ecouter`, `parler`, `lire-compter`, `dessiner`, `bouger`, `calme` ; le premier range le jeu) et ce qu'il fait travailler, en une phrase |

| Champ d'une carte | Rôle                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`              | identifiant stable dans le pack (minuscules, chiffres, tirets), unique                                            |
| `answer`          | réponse (unique dans le pack) ; pour `glyph`, le caractère ; pour `melody`, le titre                              |
| `text`            | question (`question`), bruit à imiter (`sound`), texte montré (`image`)                                           |
| `hint`            | indice ou consigne pour le parent (obligatoire pour `glyph` et `melody`)                                          |
| `hints`           | facultatif : indices suivants (1 à 3), donnés un à un par « Encore un indice »                                    |
| `talk`            | facultatif : question pour en parler ensemble, ouverte et bienveillante, montrée au parent avec la réponse        |
| `emoji`, `color`  | visuel montré en grand (`image`), ou image des choix (« Répondre en montrant ») ; couleur `#rrggbb` en minuscules |
| `melody`, `bpm`   | air noté et tempo (`melody` seulement), voir `src/games/chanson/melody.ts`                                        |
| `level`           | niveau par âge, obligatoire : `1` Petits (3-4 ans), `2` Moyens (5-6), `3` Grands (7+)                             |
| `tags`            | facultatif : thèmes, en minuscules (`["ferme"]`)                                                                  |
| `lang`            | facultatif : langue de la carte si elle diffère du pack                                                           |

Textes : 140 caractères au plus, sans espace au début ni à la fin. Un champ inconnu est refusé
(faute de frappe).

## Packs actuels

| Fichier                       | Jeu                        | Type       |
| ----------------------------- | -------------------------- | ---------- |
| `chansons.json`               | Quelle chanson ?           | `melody`   |
| `lettres.json`                | Quelle lettre ?            | `glyph`    |
| `chiffres.json`               | Quelle lettre ? (chiffres) | `glyph`    |
| `dessin.json`                 | Dessine ça                 | `draw`     |
| `catalogue-animal.json`       | Quel animal ?              | `sound`    |
| `catalogue-couleur.json`      | Quelle couleur ?           | `image`    |
| `catalogue-mime.json`         | Mime ça                    | `image`    |
| `catalogue-devinette.json`    | Devinettes                 | `question` |
| `catalogue-emotion.json`      | Quelle émotion ?           | `image`    |
| `catalogue-emotion-mime.json` | Mime l’émotion             | `image`    |
| `catalogue-tresor.json`       | Chasse au trésor           | `question` |
| `catalogue-vrai-faux.json`    | Vrai ou faux rigolo        | `question` |

## Cartes « vrai ou faux »

Une carte `question` dont la réponse commence par « Vrai » ou « Faux » (`"Faux ! Ils n’ont pas de pieds."`)
se joue en vrai ou faux (#56) : pas d'indice « Ça commence par… », qui donnerait la réponse, et, pour
« Répondre en montrant », deux choix 👍 Vrai / 👎 Faux au lieu des cartes voisines. La suite de la
réponse est la courte explication que le parent lit après « Voir la réponse ». Règle dans
`src/games/vraifaux/verdict.ts` ; elle vaut aussi pour les jeux créés par le parent.
