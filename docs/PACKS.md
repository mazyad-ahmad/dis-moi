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
| `steps`           | Remets dans l'ordre (`image`) : 3 à 5 étapes dans l'ordre attendu, `{"text", "emoji"}` (emoji facultatif)         |

Textes : 140 caractères au plus, sans espace au début ni à la fin. Un champ inconnu est refusé
(faute de frappe).

## Packs actuels

| Fichier                        | Jeu                        | Type       |
| ------------------------------ | -------------------------- | ---------- |
| `chansons.json`                | Quelle chanson ?           | `melody`   |
| `lettres.json`                 | Quelle lettre ?            | `glyph`    |
| `chiffres.json`                | Quelle lettre ? (chiffres) | `glyph`    |
| `dessin.json`                  | Dessine ça                 | `draw`     |
| `raconte.json`                 | Raconte-moi                | `chat`     |
| `voix.json`                    | Voix rigolotes             | `image`    |
| `histoire.json`                | Histoire à inventer        | `story`    |
| `catalogue-animal.json`        | Quel animal ?              | `sound`    |
| `catalogue-couleur.json`       | Quelle couleur ?           | `image`    |
| `catalogue-mime.json`          | Mime ça                    | `image`    |
| `catalogue-devinette.json`     | Devinettes                 | `question` |
| `catalogue-emotion.json`       | Quelle émotion ?           | `image`    |
| `catalogue-emotion-mime.json`  | Mime l’émotion             | `image`    |
| `catalogue-tresor.json`        | Chasse au trésor           | `question` |
| `catalogue-vrai-faux.json`     | Vrai ou faux rigolo        | `question` |
| `catalogue-jacques.json`       | Jacques a dit              | `question` |
| `catalogue-rime.json`          | Ça rime avec…              | `question` |
| `catalogue-contraire.json`     | Les contraires             | `question` |
| `catalogue-ombre.json`         | Ombres                     | `image`    |
| `catalogue-intrus.json`        | L’intrus                   | `image`    |
| `catalogue-disparu.json`       | Qu’est-ce qui a disparu ?  | `image`    |
| `catalogue-compte.json`        | Compte avec moi            | `image`    |
| `catalogue-devine-tete.json`   | Devine-tête                | `image`    |
| `catalogue-syllabes.json`      | Tape les syllabes          | `question` |
| `catalogue-tri.json`           | Où ça va ?                 | `question` |
| `catalogue-devine-mains.json`  | Devine avec tes mains      | `question` |
| `catalogue-suite.json`         | La suite logique           | `image`    |
| `catalogue-ordre.json`         | Remets dans l’ordre        | `image`    |
| `catalogue-situation.json`     | Que fais-tu si… ?          | `question` |
| `catalogue-ni-oui-ni-non.json` | Ni oui ni non              | `question` |
| `catalogue-heure.json`         | Quelle heure est-il ?      | `image`    |
| `catalogue-marche.json`        | Le petit marché            | `image`    |

## Cartes « Compte avec moi »

Les cartes de `catalogue-compte.json` (#65) sont des **objets à compter** : `emoji` et `answer`, le
nom au pluriel avec « Les » (« Les pommes »), dont le singulier s'obtient en retirant le `s` ou le `x`
final (« 1 pomme »). Le niveau de l'objet règle la difficulté de la manche, générée au hasard (compter
jusqu'à 5, 10 ou 20, comparer, additionner, soustraire). Règles dans `src/games/compte/compte.ts`.

## Cartes « Tape les syllabes »

Une carte `question` de thème `syllabes` se joue en Tape les syllabes (#127) : `text` est le mot
(« Chocolat »), `answer` le mot découpé comme on le dit, syllabes séparées par des tirets
(« cho-co-lat » ; « pomme », une seule). Découpage oral : un « e » final muet reste collé à la
syllabe d'avant (« gi-rafe ») ; les lettres, tirets ôtés, redonnent le mot. Avec le thème `trouve`
en plus, c'est la variante « Trouve un mot qui a 3 syllabes. » : le nombre est lu dans `text` et
`answer` donne des exemples découpés, séparés par des virgules. Règle dans
`src/games/syllabes/syllabes.ts`.

## Séquences « Remets dans l’ordre »

Une carte de `catalogue-ordre.json` (#131) est une **séquence** : `answer` son nom (« Se laver
les mains »), `text` la question lue par le parent, `steps` ses étapes dans l'ordre attendu,
chacune avec son texte et, si possible, son emoji (sans doublon dans la séquence). Petits :
3 étapes, Moyens : 4, Grands : 5. Règles dans `src/games/ordre/ordre.ts`.

## Situations « Que fais-tu si… ? »

Une carte de `catalogue-situation.json` (#133) est une **petite situation du quotidien**, sans
bonne réponse : `text` la situation lue par le parent (« Ton copain est triste à la récré. »),
`answer` son nom court, `emoji` son image, `hint` puis `hints` les pistes de réponse proposées au
parent (2 ou 3, bienveillantes, jamais culpabilisantes), `talk` la question pour en parler.
Petits et Moyens : rien de danger, d'abandon ni de violence (mots écartés vérifiés par les tests).
Une situation qui demande d'être rassuré (« perdu au magasin ») porte le thème `rassurer` : Grands
seulement, toujours avec une issue rassurante, et jamais jouée au Coucher. Règles dans
`src/games/situation/situation.ts`.

## Éléments d'histoire

Un pack `story` (Histoire à inventer, #68) range des héros, des lieux et des objets : `answer` est le
mot avec son article (« un dragon », « au zoo », « une clé »), `emoji` son image (obligatoire), et
`tags` donne un seul rôle, `heros`, `lieu` ou `objet`. Règle dans `src/games/histoire/parts.ts`.

## Cartes « Où ça va ? »

Les cartes de `catalogue-tri.json` (#130) sont des **éléments à ranger** : `answer` l'élément avec
son article (« La vache »), `emoji` son image, `text` la phrase d'explication lue par le parent, et
`tags` le thème (`tri-animaux`, `tri-aliments`, `tri-vetements`, `tri-objets`, `tri-temperature`,
`tri-transports`) suivi de la ou des familles où il va (`["tri-animaux", "ferme"]`). Deux familles
(`["tri-animaux", "ferme", "foret"]`) : la carte est discutable, le parent en est prévenu et chacune
est acceptée. Thèmes, familles et question dans `src/games/tri/tri.ts`.

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

## Objets « Devine avec tes mains »

Les cartes de `catalogue-devine-mains.json` (#134) sont des **objets du quotidien** à glisser
dans un sac : `answer` le nom avec l'article, `emoji` son image, `text` de quoi le décrire au
toucher (« Ronde, un peu poilue, elle rebondit. »). Chaque objet ajouté doit respecter le rappel
de sécurité, pour tous les âges : **4 cm au moins** (plus gros qu'une balle de ping-pong), rien de
coupant ni de pointu, rien de chaud, rien à pile, rien de fragile, pas de ficelle. Au moins
6 objets par niveau, pour qu'une liste ne change pas de niveau. Règles dans `src/games/mains/mains.ts`.

## Images de « La suite logique »

Les cartes de `catalogue-suite.json` (#129) sont des **images à mettre en suite** : `emoji` et
`answer`, le nom avec « un » ou « une » (« une pomme »), dont le pluriel s'obtient en ajoutant un
`s` à chaque mot (« 4 carrés bleus »), et un seul thème dans `tags`, la famille (`formes`,
`fruits`…), où le jeu prend les autres images de la suite. Une famille compte au moins quatre
images ; dans `formes`, chaque couleur a sa propre forme. Le niveau de l'image règle le motif
(AB ; ABC, AAB, ABB ; suites qui grandissent). Règles dans `src/games/suite/suite.ts`.

## Questions « Ni oui ni non »

Les cartes de `catalogue-ni-oui-ni-non.json` (#135) sont des **questions qui appellent oui ou
non** (« Tu aimes le chocolat ? ») : `text` la question, `answer` une idée de réponse qui évite
les deux mots (« J'adore ça ! »), montrée au parent à la demande. Le thème `astuce` marque les
relances piégeuses (« Tu es sûr ? »). Toutes de niveau 3 (Grands). Règles dans
`src/games/nioui/nioui.ts`.

## Heures de « Quelle heure est-il ? »

Une carte de `catalogue-heure.json` (#136) est une **heure** : `text` en chiffres, au quart
près, sur un cadran de 12 heures (« 3:15 »), `answer` comme on la dit (« 3 heures et quart »,
« 4 heures moins le quart », « midi et demi »), vérifiée par les tests, et `id` l'heure
(« 3h15 »). Niveau 2 pour les heures pile, 3 pour les quarts et demies. L'horloge est dessinée
par l'appli. Règles dans `src/games/heure/heure.ts`.

## Articles du « Petit marché »

Une carte de `catalogue-marche.json` (#136) est un **article** : `emoji`, `answer` avec « un »
ou « une » (« une baguette ») et le prix dans `text` (« 1 € », « 1,20 € »), réaliste, **moins de
10 €** et multiple de 10 centimes. Niveau 2 : euros ronds, 5 € au plus ; niveau 3 : avec des
centimes. Règles dans `src/games/marche/marche.ts`.
