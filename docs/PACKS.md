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
| `kind`                             | `sound`, `image`, `draw`, `question` (jeux à cartes), `melody`, `glyph`, `chat` (questions ouvertes), `story` (éléments d'histoire)                                 |
| `name`, `lang`                     | nom (30 caractères max) et langue (`fr`)                                                                                                                            |
| `category`, `desc`, `mark`, `tint` | jeux du catalogue : fichier `catalogue-<id>.json`, ordre dans `CATALOGUE_PACKS`                                                                                     |
| `moves`                            | facultatif : `true` si le jeu fait bouger l'enfant (mime) ; écarté au Coucher                                                                                       |
| `still`                            | facultatif, avec `moves` : `true` si le jeu a une version sans bouger (chasse au trésor), jouée au Coucher et en Voiture                                            |
| `shadow`                           | facultatif, jeux `image` : `true` pour montrer les emoji en silhouette, révélés avec la réponse (Ombres)                                                            |
| `activities`, `skill`              | jeux du catalogue : types (`ecouter`, `parler`, `lire-compter`, `dessiner`, `bouger`, `calme` ; le premier range le jeu) et ce qu'il fait travailler, en une phrase |

| Champ d'une carte | Rôle                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`              | identifiant stable dans le pack (minuscules, chiffres, tirets), unique                                            |
| `answer`          | réponse (unique dans le pack) ; pour `glyph`, le caractère ; pour `melody`, le titre ; pour `chat`, la question   |
| `text`            | question (`question`), bruit à imiter (`sound`), texte montré (`image`)                                           |
| `hint`            | indice ou consigne pour le parent (obligatoire pour `glyph` et `melody`)                                          |
| `hints`           | facultatif : indices suivants (1 à 3), donnés un à un par « Encore un indice »                                    |
| `talk`            | facultatif : question pour en parler ensemble, ouverte et bienveillante, montrée au parent avec la réponse        |
| `emoji`, `color`  | visuel montré en grand (`image`), ou image des choix (« Répondre en montrant ») ; couleur `#rrggbb` en minuscules |
| `melody`, `bpm`   | air noté et tempo (`melody` seulement), voir `src/games/chanson/melody.ts`                                        |
| `level`           | niveau par âge, obligatoire : `1` Petits (3-4 ans), `2` Moyens (5-6), `3` Grands (7+)                             |
| `tags`            | facultatif : thèmes, en minuscules (`["ferme"]`) ; pour `chat`, un thème obligatoire (`journee`, `imaginer`…)     |
| `lang`            | facultatif : langue de la carte si elle diffère du pack                                                           |
| `others`          | L'intrus (`image`) : les trois emoji qui vont ensemble ; l'intrus est `emoji`, la règle cachée `text`             |

Textes : 140 caractères au plus, sans espace au début ni à la fin. Un champ inconnu est refusé
(faute de frappe).

## Packs actuels

| Fichier                       | Jeu                        | Type       |
| ----------------------------- | -------------------------- | ---------- |
| `chansons.json`               | Quelle chanson ?           | `melody`   |
| `lettres.json`                | Quelle lettre ?            | `glyph`    |
| `chiffres.json`               | Quelle lettre ? (chiffres) | `glyph`    |
| `dessin.json`                 | Dessine ça                 | `draw`     |
| `raconte.json`                | Raconte-moi                | `chat`     |
| `voix.json`                   | Voix rigolotes             | `image`    |
| `histoire.json`               | Histoire à inventer        | `story`    |
| `catalogue-animal.json`       | Quel animal ?              | `sound`    |
| `catalogue-couleur.json`      | Quelle couleur ?           | `image`    |
| `catalogue-mime.json`         | Mime ça                    | `image`    |
| `catalogue-devinette.json`    | Devinettes                 | `question` |
| `catalogue-emotion.json`      | Quelle émotion ?           | `image`    |
| `catalogue-emotion-mime.json` | Mime l’émotion             | `image`    |
| `catalogue-tresor.json`       | Chasse au trésor           | `question` |
| `catalogue-vrai-faux.json`    | Vrai ou faux rigolo        | `question` |
| `catalogue-jacques.json`      | Jacques a dit              | `question` |
| `catalogue-rime.json`         | Ça rime avec…              | `question` |
| `catalogue-contraire.json`    | Les contraires             | `question` |
| `catalogue-ombre.json`        | Ombres                     | `image`    |
| `catalogue-intrus.json`       | L’intrus                   | `image`    |
| `catalogue-disparu.json`      | Qu’est-ce qui a disparu ?  | `image`    |
| `catalogue-compte.json`       | Compte avec moi            | `image`    |

## Cartes « Compte avec moi »

Les cartes de `catalogue-compte.json` (#65) sont des **objets à compter** : `emoji` et `answer`, le
nom au pluriel avec « Les » (« Les pommes »), dont le singulier s'obtient en retirant le `s` ou le `x`
final (« 1 pomme »). Le niveau de l'objet règle la difficulté de la manche, générée au hasard (compter
jusqu'à 5, 10 ou 20, comparer, additionner, soustraire). Règles dans `src/games/compte/compte.ts`.

## Éléments d'histoire

Un pack `story` (Histoire à inventer, #68) range des héros, des lieux et des objets : `answer` est le
mot avec son article (« un dragon », « au zoo », « une clé »), `emoji` son image (obligatoire), et
`tags` donne un seul rôle, `heros`, `lieu` ou `objet`. Règle dans `src/games/histoire/parts.ts`.

## Cartes « vrai ou faux »

Une carte `question` dont la réponse commence par « Vrai » ou « Faux » (`"Faux ! Ils n’ont pas de pieds."`)
se joue en vrai ou faux (#56) : pas d'indice « Ça commence par… », qui donnerait la réponse, et, pour
« Répondre en montrant », deux choix 👍 Vrai / 👎 Faux au lieu des cartes voisines. La suite de la
réponse est la courte explication que le parent lit après « Voir la réponse ». Règle dans
`src/games/vraifaux/verdict.ts` ; elle vaut aussi pour les jeux créés par le parent.

## Cartes « Jacques a dit »

Une carte `question` de thème `jacques-a-dit` ou `piege` (`"tags": ["piege"]`) se joue en Jacques a
dit (#57) : le texte est la consigne que le parent lit (« Jacques a dit : … » en tête, sauf pour un
piège), et l'écran dit d'emblée au parent si c'est un piège, sans réponse à dévoiler ni indice ni
choix à montrer. La réponse, un nom court du geste (« Toucher son nez »), reste unique dans le pack
mais n'est pas affichée. Règle dans `src/games/jacques/consigne.ts`.
