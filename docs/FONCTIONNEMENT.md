# Fonctionnement

> Les règles marquées **(proposition)** sont à valider dans l'issue #2.

## Principe

- **Un seul appareil**, tenu par le parent.
- Le parent lit la question, l'enfant répond **à voix haute** (ou dessine au doigt).
- Le parent valide : **Trouvé** (gagne une étoile) ou **Pas encore / Passer**.
- Les zones « **Pour le parent** » (réponse, indice, consigne) sont fermées par défaut :
  la réponse ne s'affiche qu'après « Voir la réponse ».

## Déroulé d'une partie (proposition)

1. Depuis l'accueil, le parent choisit un jeu.
2. Une partie = **10 manches**.
3. À chaque manche : **Trouvé** → +1 étoile ; **Pas encore / Passer** → 0 étoile, manche suivante.
4. Après la 10ᵉ manche : écran de résultat (« 7 étoiles gagnées ensemble ! »),
   boutons **Rejouer** et **Accueil**.
5. Le bouton ✕ en haut quitte la partie à tout moment ; les étoiles déjà gagnées sont gardées.
6. Pas d'échec ni de compte à rebours punitif : le jeu reste un moment partagé.

## Étoiles (proposition)

- Les étoiles sont **communes** à la famille (« gagnées ensemble »), pas un classement entre enfants.
- Chaque partie est enregistrée : date, jeu, joueurs présents, étoiles.
- L'accueil rappelle la dernière partie ; l'onglet Étoiles montre le total et l'historique.

## Plusieurs enfants (proposition)

- Les prénoms sont enregistrés une fois (6 maximum, 20 caractères, pas de doublon).
- Par défaut, on joue **en équipe**.
- Option ultérieure : **tour par tour**, le prénom de l'enfant dont c'est le tour s'affiche
  en haut de la manche.

## Jeux

| Jeu                               | Règle proposée                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Quelle chanson ?**              | Extrait de 10 s, réécoutable. Indice visible, titre caché derrière « Voir la réponse ».                                           |
| **Quelle lettre, quel chiffre ?** | Lettres majuscules A-Z ou chiffres 0-9, tirés au hasard sans répétition dans la partie. Consigne parent associée à chaque glyphe. |
| **Dessine ça**                    | Minuteur de **60 s** ; à zéro, le dessin reste visible et le parent valide. Pas de note du dessin : « C'est fini » = +1 étoile.   |

## Public visé (proposition)

- **3 à 7 ans**. Niveaux de difficulté reportés après la v1.
- Interface en **français uniquement** pour la v1.

## Espace Parent (proposition)

- Joueurs, thème (auto / jour / nuit), nombre de manches, durée du minuteur,
  remise à zéro des étoiles.
- Pas de verrou dans la v1 : l'appli est déjà tenue par le parent. Un verrou simple
  (ex. « 7 + 5 = ? ») pourra être ajouté si besoin.

## Écrans

1. **Accueil** — titre « On joue à quoi ? », joueurs (prénoms, modifiables), grille des jeux,
   rappel de la dernière partie, barre de navigation _Jeux · Étoiles · Parent_.
2. **Quelle chanson ?** — manche _n_ sur 10, compteur d'étoiles, lecteur d'extrait (10 s),
   bloc parent avec titre caché + indice, bouton « Voir la réponse ».
3. **Quelle lettre, quel chiffre ?** — bascule Lettres / Chiffres, glyphe en grand
   (« Montre l'écran à l'enfant »), consigne parent, boutons Passer / Trouvé.
4. **Dessine ça** — minuteur, mot lu par le parent, zone de dessin au doigt,
   boutons Passer / C'est fini.
5. **Ajouter un jeu** — catalogue (Quel animal ?, Quelle couleur ?, Mime ça, Devinettes)
   avec bouton Ajouter / Ajouté, et formulaire « Créer mon propre jeu »
   (nom, type : Son / Image / Mot à dessiner / Question, puis ajout des questions).

## Principes produit

- Hors ligne d'abord : tout fonctionne sans réseau une fois l'appli installée.
- Aucune donnée ne quitte l'appareil (pas de compte, pas d'analytics, pas de pub).
- Thème jour / nuit, gros boutons (≥ 48 px), contrastes AA.
