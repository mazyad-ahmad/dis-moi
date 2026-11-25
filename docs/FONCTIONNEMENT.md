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
   Un rafraîchissement de la page (ou le rechargement après une mise à jour) reprend la partie
   là où elle en était : même carte, même manche, mêmes étoiles.
6. Pas d'échec ni de compte à rebours punitif : le jeu reste un moment partagé.

## Étoiles (proposition)

- Les étoiles sont **communes** à la famille (« gagnées ensemble »), pas un classement entre enfants.
- Chaque partie est enregistrée : date, jeu, joueurs présents, étoiles.
- L'accueil rappelle la dernière partie ; l'onglet Étoiles montre le total, les 30 dernières
  parties (jeu, jour, joueurs, manches si la partie a été quittée) et des **récompenses** débloquées
  à 1, 10, 25, 50, 100 et 250 étoiles.
- Remise à zéro des étoiles depuis l'espace Parent (efface l'historique).

## Plusieurs enfants (proposition)

- Les prénoms sont enregistrés une fois (6 maximum, 20 caractères, pas de doublon).
- Par défaut, on joue **en équipe**.
- Option ultérieure : **tour par tour**, le prénom de l'enfant dont c'est le tour s'affiche
  en haut de la manche.

## Jeux

| Jeu                               | Règle proposée                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Quelle chanson ?**              | Extrait de 10 s, réécoutable. Indice visible, titre caché derrière « Voir la réponse ». Voir « Contenu des chansons ».            |
| **Quelle lettre, quel chiffre ?** | Lettres majuscules A-Z ou chiffres 0-9, tirés au hasard sans répétition dans la partie. Consigne parent associée à chaque glyphe. |
| **Dessine ça**                    | Minuteur de **60 s** ; à zéro, le dessin reste visible et le parent valide. Pas de note du dessin : « C'est fini » = +1 étoile.   |

### Contenu des chansons

- Uniquement des **airs traditionnels ou du domaine public** (Frère Jacques, Au clair de la lune,
  Joyeux anniversaire, Vive le vent, Ode à la joie…), liste dans `src/games/chanson/songs.ts`.
- Les mélodies sont **jouées par un petit synthétiseur** dans l'appli (Web Audio), à partir
  d'une notation texte : aucun enregistrement, donc pas de droits d'interprète ni de fichier
  audio à télécharger, et le jeu marche hors ligne.
- Chaque partie tire 10 chansons différentes.

### Jeux du catalogue

Le parent les ajoute depuis « Ajouter un jeu » (bouton Ajouter / Ajouté) ; ils apparaissent
alors sur l'accueil. Ils suivent le même déroulé (manches, étoiles) et un format commun de
cartes : réponse, indice, et selon le jeu une question, un bruit, un emoji ou une couleur.

| Jeu                  | Règle proposée                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Quel animal ?**    | Le **parent imite le cri** affiché (« Meuh ! ») et l'enfant devine. Pas d'enregistrement de cris pour la v1 (droits) : à revoir si besoin. |
| **Quelle couleur ?** | Une pastille de couleur en grand, l'enfant la nomme.                                                                                       |
| **Mime ça**          | L'écran montre à l'enfant ce qu'il doit mimer (emoji + consigne), le parent devine.                                                        |
| **Devinettes**       | Le parent lit l'énigme, la réponse est cachée derrière « Voir la réponse ».                                                                |

### Créer mon propre jeu

- Nom (30 caractères), type choisi à la création : **Son**, **Image**, **Mot à dessiner** ou **Question**.
- Cartes (50 maximum) : réponse et indice facultatif, plus selon le type :
  - Son : un **enregistrement** au micro (10 s maximum) ou un bruit à imiter par le parent ;
  - Image : une **photo** de l'appareil (réduite à 1280 px) ou un texte à montrer ;
  - Question : le texte de la question ;
  - Mot à dessiner : le mot, joué comme « Dessine ça ».
- Une partie compte autant de manches que réglé, ou moins si le jeu a moins de cartes.
- Les cartes se modifient et se suppriment ; le jeu entier aussi. Photos et sons restent dans le
  téléphone (IndexedDB).
- **Partager un jeu** : « Partager le jeu (fichier) » crée un fichier `nom-du-jeu.dismoi.json`
  (cartes, photos et sons compris) et ouvre le partage Android (WhatsApp, e-mail, Drive…) ; sans
  partage disponible, le fichier est téléchargé. Rien n'est envoyé sans ce geste du parent.
- **Importer un jeu** : « Importer un jeu (fichier) » dans « Ajouter un jeu ». Le fichier est
  vérifié (format, type, 50 cartes, seulement des images et des sons, 30 Mo maximum) puis ajouté
  comme un nouveau jeu ; si le nom existe déjà, il devient « Nom (2) ».

### Sauvegarde complète et stockage

- **Stockage protégé** : après la première partie ou la première création de jeu, l'appli demande
  au navigateur un stockage persistant (`navigator.storage.persist()`) pour qu'il ne l'efface pas
  si le téléphone manque de place. L'espace Parent affiche l'état et la place utilisée.
- **Sauvegarder tout** (espace Parent) : un fichier `dis-moi-AAAA-MM-JJ.dismoi-sauvegarde.json`
  avec joueurs, parties, réglages et jeux créés (photos et sons en base64, au même format que les
  fichiers de jeu). Format `dis-moi/sauvegarde`, version 1. Même canal que le partage d'un jeu :
  partage Android, sinon téléchargement.
- **Restaurer une sauvegarde** : le fichier est entièrement vérifié avant toute écriture (format,
  version, chaque joueur, partie et jeu, 200 Mo maximum) ; un fichier refusé ne change rien. Le
  parent voit le contenu et choisit :
  - **Tout remplacer** : les données du téléphone sont remplacées à l'identique ;
  - **Fusionner** : la sauvegarde s'ajoute sans doublon (joueurs reconnus par leur prénom, parties
    par leur jeu et leur heure de début, jeux créés par leur type, leur date et leurs réponses) ;
    les réglages du téléphone sont gardés, les jeux du catalogue s'additionnent ; refusé s'il y
    aurait plus de 6 joueurs.
- **Rappel** : s'il y a des jeux créés et aucune sauvegarde depuis plus de 30 jours (ou jamais), un
  rappel discret apparaît dans l'espace Parent.

### Enregistrement des parties

- Une partie est enregistrée dès la première manche jouée, puis mise à jour à chaque manche :
  si on quitte en cours de route, les étoiles gagnées sont gardées.
- La partie en cours (tirage, manche, étoiles) est aussi gardée pour l'onglet (`sessionStorage`) :
  après un rafraîchissement, elle reprend et continue le même enregistrement, sans doublon.
  Elle est effacée en fin de partie, quand on quitte le jeu et à la fermeture de l'onglet.
  Dans « Dessine ça », le mot est gardé ; le minuteur et le dessin repartent à zéro.
- Données gardées : jeu, date, manches jouées, étoiles, joueurs présents (sur l'appareil uniquement).

## Public visé (proposition)

- **3 à 7 ans**. Niveaux de difficulté reportés après la v1.
- Interface en **français uniquement** pour la v1.

## Espace Parent (proposition)

- Joueurs, jeux, thème (auto / jour / nuit), **manches par partie** (5, 10 ou 15),
  **minuteur de Dessine ça** (30 s, 1 min, 1 min 30), remise à zéro des étoiles,
  effacement de toutes les données. Chaque action destructive demande confirmation.
- Les réglages s'appliquent à la partie suivante.
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
