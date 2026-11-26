# Fonctionnement

> Les règles marquées **(proposition)** sont à valider dans l'issue #2.

## Principe

- **Un seul appareil**, tenu par le parent.
- Le parent lit la question, l'enfant répond **à voix haute** (ou dessine au doigt).
- Le parent valide : **Trouvé** (gagne une étoile) ou **Pas encore / Passer**.
- Les zones « **Pour le parent** » (réponse, indice, consigne) sont fermées par défaut :
  la réponse ne s'affiche qu'après « Voir la réponse ».
- **Indices en escalier** : quand l'enfant sèche, « Encore un indice » en montre un de plus à
  chaque appui, jamais la réponse : d'abord les indices écrits de la carte (`hint`, puis la liste
  facultative `hints`), puis « Ça commence par « V » » (première lettre du mot à deviner, articles
  sautés), généré pour toute carte. Dans « Quelle chanson ? », un indice fait aussi passer
  l'extrait au ralenti (mêmes notes, tempo × 0,7). Le bouton disparaît une fois la réponse vue.
  Pas de pénalité : **Trouvé** rapporte une étoile, quel que soit le nombre d'indices.
- **Pour prolonger** (#124) : une phrase courte pour continuer la discussion une fois la réponse
  trouvée (« Demande-lui où vit la vache », « Cherchez ensemble quelque chose de rouge dans la
  pièce »). Elle apparaît dans « Pour le parent » **après la réponse** (avec « Voir la réponse »),
  ou d'emblée quand la réponse est déjà à l'écran (lettres et chiffres, « Répondre en montrant »).
  Rédigée pour toutes les cartes du catalogue, des chansons, des lettres et des chiffres (pas pour
  les mots à dessiner, joués sans bloc parent) ; jamais une consigne risquée, et rien qui demande
  de bouger dans les jeux joués en voiture (relu à la main).

## Déroulé d'une partie (proposition)

1. Depuis l'accueil, le parent choisit un jeu.
2. Une partie = **10 manches**.
3. À chaque manche : **Trouvé** → +1 étoile ; **Pas encore / Passer** → 0 étoile, manche suivante.
4. Après la 10ᵉ manche : écran de résultat (« 7 étoiles gagnées ensemble ! »). Les étoiles
   gagnées y apparaissent une à une, chacune avec le petit son de l'étoile, puis un message
   varié selon le score, toujours positif (sans étoile : « ce sera pour la prochaine partie »).
   Une récompense franchie pendant la partie y est fêtée, une seule fois (son son a déjà été
   joué en jeu, il n'est pas rejoué), et la suivante est rappelée (« Encore 3 étoiles pour la
   récompense « 25 étoiles » »). Boutons **Un autre jeu** (le jeu suivant de l'accueil),
   **Accueil** et **Rejouer**.
5. Le bouton ✕ en haut quitte la partie à tout moment ; les étoiles déjà gagnées sont gardées.
   Un rafraîchissement de la page (ou le rechargement après une mise à jour) reprend la partie
   là où elle en était : même carte, même manche, mêmes étoiles.
6. Pas d'échec ni de compte à rebours punitif : le jeu reste un moment partagé.

## Joueurs et avatars

- Un joueur, c'est un **prénom** et un **avatar** : un animal (12 au choix : renard, ours, lapin,
  chat, chien, lion, panda, grenouille, tortue, hibou, pingouin, koala) sur une couleur (6 au
  choix : vert, bleu, orange, rose, violet, rouge). Un enfant qui ne lit pas encore reconnaît son
  animal. 6 joueurs maximum.
- À l'ajout, l'avatar proposé est le premier animal et la première couleur que personne n'a ; le
  parent peut le choisir avant d'ajouter le prénom, puis le changer en touchant l'animal.
- L'avatar apparaît dans la gestion des joueurs, sur l'accueil et dans l'historique des parties.
  Son nom accessible est « prénom, animal » (« Léa, renard »).
- Les animaux sont des emoji, dessinés par la police du téléphone : aucun fichier ajouté. Les
  couleurs ont un cercle contrasté (3:1 au moins sur le fond, en jour et en nuit, vérifié par
  `src/components/avatar.test.ts`).
- Les joueurs enregistrés avant les avatars en reçoivent un à la mise à jour (animaux dans l'ordre
  d'ajout, couleur gardée) ; une sauvegarde plus ancienne aussi, à la restauration.

## Étoiles (proposition)

- Les étoiles sont **communes** à la famille (« gagnées ensemble »), pas un classement entre enfants.
- Chaque partie est enregistrée : date, jeu, joueurs présents, étoiles.
- L'accueil rappelle la dernière partie ; l'onglet Étoiles montre le total, les 30 dernières
  parties (jeu, jour, joueurs, manches si la partie a été quittée) et des **récompenses** débloquées
  à 1, 10, 25, 50, 100 et 250 étoiles.
- Remise à zéro des étoiles depuis l'espace Parent (efface l'historique) : l'onglet Étoiles
  affiche aussitôt « Pas encore d'étoiles », puis les étoiles des parties suivantes, sans recharger.
- **Animations de récompense** : au « Trouvé », une étoile part du bouton et rejoint le compteur,
  qui rebondit ; chaque nouvelle manche entre en douceur ; des confettis tombent sur l'écran de fin.
  Elles ne retardent jamais la manche suivante (on peut enchaîner vite) et sont toutes coupées
  quand le téléphone demande de « réduire les animations ».

## Défi du jour (#43)

- Une **carte surprise par jour** sur l'accueil, tirée de tous les jeux intégrés (chansons,
  lettres, chiffres, mots à dessiner et les jeux du catalogue, même pas encore ajoutés).
- Le tirage ne dépend que de la **date du téléphone** : la même carte toute la journée, une
  nouvelle à minuit (heure du téléphone), sans réseau (`src/games/defi/daily.ts`).
- Une seule carte, sans minuteur : **Trouvé** (ou « C'est fini » pour un dessin) rapporte une
  **étoile bonus** gagnée ensemble, enregistrée comme une partie « Défi du jour », puis un mot
  gentil. **Pas encore** ramène à l'accueil sans rien enregistrer : le défi reste là toute la journée.
- Réussi, l'accueil dit « À demain pour une nouvelle surprise ». Aucune série, aucune
  notification, rien sur les jours sans défi.
- Masqué pendant la fin de séance, et depuis l'espace Parent (réglage **Défi du jour** :
  affiché par défaut).

## Façons de jouer (#42)

- Sur l'accueil, **Façon de jouer** : **Normal** (par défaut), **Express**, **Coucher** ou
  **Voiture**, avec une phrase qui dit ce que le mode change. Le choix est gardé d'une partie à
  l'autre (réglage `gameMode`, comme le niveau) et s'applique à la partie suivante.
- **Express** : 3 manches (ou moins si le réglage de l'espace Parent est plus court).
- **Coucher** : thème nuit imposé, volume doux imposé, pas de minuteur dans les dessins, pas de
  jeu qui fait bouger (Mime ça ; plus tard la chasse au trésor). Fin en douceur : ni confettis
  ni vibration de fête, la mascotte dort, « C'est l'heure de dormir. Bonne nuit ! », pas de
  bouton « Un autre jeu ».
- **Voiture** : seulement des cartes orales (Quelle chanson ?, Quel animal ?, Devinettes, jeux
  créés « Son » et « Question ») ; rien à regarder ni à dessiner.
- L'accueil, le Grand Jeu, le Défi du jour et « Un autre jeu » ne proposent que les jeux qui
  conviennent au mode ; un jeu qui ne convient pas, ouvert par l'adresse, ne démarre pas.
- Règle commune (`src/games/modes.ts`, fonction pure `suitsMode`) : chaque jeu déclare ce qu'il
  demande à l'enfant (`needs` : regarder l'écran, bouger), d'après son type de cartes et, pour un
  pack, le champ `moves`. Un jeu qui ne déclare rien n'est proposé ni au Coucher ni en Voiture.
- Le mode est noté dans la partie enregistrée (champ `mode`) et rappelé dans l'historique
  (« · Voiture »).

## Trouver le bon jeu (#137)

- Chaque jeu déclare un ou plusieurs **types** : Écouter, Parler, Lire et compter, Dessiner,
  Bouger, Se calmer (le premier range le jeu), une **tranche d'âge** déduite des niveaux de ses
  cartes (« Dès 3 ans », « 3-4 ans », « 3 à 6 ans ») et **ce qu'il fait travailler** en une
  phrase. Jeux de base dans `src/games/registry.ts`, jeux du catalogue dans leur pack (champs
  `activities` et `skill`), vérifiés par les tests. Règles communes, fonctions pures :
  `src/games/activities.ts`.
- **Ajouter un jeu** : le catalogue est groupé par type ; chaque jeu dit son âge et ce qu'il fait
  travailler. Filtres **Type**, **Âge** et **Moment** (« Pour le coucher », « Pour la voiture » :
  les jeux qui conviennent aux façons de jouer Coucher et Voiture, même règle `suitsMode`). Ils
  se cumulent ; toucher de nouveau la pastille choisie la retire, « Retirer les filtres » les
  retire tous. Pastilles « appuyée / non appuyée » dans des groupes nommés, nombre de jeux
  annoncé au lecteur d'écran. Une **recherche** (sans accents ni majuscules) apparaît au-delà de
  20 jeux du catalogue.
- **Accueil** : aucun jeu n'est caché. En haut, les jeux qui conviennent aux joueurs du jour (le
  niveau de la partie s'il est choisi, sinon les niveaux des joueurs actifs) ; les autres
  viennent ensuite sous « Pour d'autres âges ». Jusqu'à 6 jeux, une seule grille comme avant ; à
  partir de 7, un groupe par type. Sans joueur ni niveau renseigné, l'ordre ne change pas.
- **Jeux créés** : à la création, « Ce que fait l'enfant » (proposé d'après la forme des cartes :
  Son → Écouter, Image et Question → Parler, Mot à dessiner → Dessiner) et un **âge facultatif**
  (Tous âges par défaut). Gardés dans le fichier de jeu partagé et la sauvegarde (champs
  facultatifs `activity` et `level`, ignorés s'ils sont inconnus).

## Répondre en montrant (#123)

- Pour un enfant qui ne parle pas encore bien, timide ou qui joue dans une autre langue : sur
  l'accueil, **L'enfant répond** « À voix haute » (par défaut) ou « **En montrant** » (réglage
  `showChoices`, pour les parties suivantes).
- La carte propose alors des **choix en grand** : la bonne réponse et des cartes voisines du même
  jeu (du même niveau d'abord). **Petits : 2 choix, Moyens : 3, Grands : 4** ; le niveau est celui
  de la partie, sinon celui du plus jeune des joueurs du jour qui en a un, sinon 3 choix.
- Toucher la bonne réponse la met en valeur (contour, coche, « Oui, c'est ça : … ! ») ; un autre
  choix ne fait **rien** : ni son, ni message, on peut réessayer. Le parent valide toujours avec
  **Trouvé** / **Passer**.
- Animaux, chansons, devinettes et jeux créés de type Son ou Question : les choix s'ajoutent sous
  la carte (emoji et nom ; une chanson a son emoji ; sans image, le texte de la réponse).
- Couleurs, lettres et chiffres, jeux créés de type Image : l'enfant verrait la réponse, donc les
  choix (pastilles, glyphes, photos) **remplacent** l'image et le parent demande « Montre-moi… ».
- Pas de choix dans les jeux de dessin ni dans Mime ça, ni dans le Défi du jour. Ils marchent
  aussi dans le Grand Jeu.
- Chaque choix est un bouton d'au moins 64 px, nommé pour le lecteur d'écran (« La vache »,
  « Lettre A », « Rouge »). Images : emoji dessinés par la police du téléphone, aucun fichier.

## Mascotte (proposition)

- Une petite bulle qui parle, dessinée pour l'appli en SVG dans le code (pas d'image à charger,
  pas de droits tiers), aux couleurs du thème jour / nuit. Son nom reste à choisir : il n'est
  affiché nulle part.
- Discrète, jamais pendant une manche : elle **dit bonjour** sur l'accueil (elle **dort** en thème
  nuit et après la fin de séance), **réfléchit** sur les écrans vides (pas encore d'étoiles, jeu
  sans carte) et dit **bravo** sur l'écran de fin.
- Décorative (cachée aux lecteurs d'écran) ; ses petits mouvements (clignement, signe de la main,
  sauts, « z ») s'arrêtent avec « réduire les animations ».

## Plusieurs enfants (proposition)

- Les prénoms sont enregistrés une fois (6 maximum, 20 caractères, pas de doublon).
- **Qui joue aujourd'hui ?** (#37) : sur l'accueil, chaque prénom est une pastille à appuyer
  pour l'activer ou la désactiver (bouton « appuyé / non appuyé », utilisable au clavier). Un
  nouveau joueur est actif. Le choix est gardé d'une partie à l'autre (réglage local
  `absentPlayers`, hors sauvegarde) ; seuls les joueurs actifs sont enregistrés avec la partie.
  Sans joueur enregistré, rien ne change. Pour les autres modes : `useActivePlayers()` /
  `listActivePlayers()` de `src/data/players.ts`.
- Par défaut, on joue **en équipe**.
- **Chacun son tour** (#38) : dès deux joueurs actifs, l'accueil propose « En équipe » ou
  « Chacun son tour » (réglage `turnMode`, gardé d'une partie à l'autre et dans la sauvegarde).
  Au lancement, l'ordre de passage est tiré au sort, puis on suit la rotation : avec 3 joueurs
  et 10 manches, 4-3-3. En haut de chaque manche, l'avatar, le prénom et la couleur de l'enfant
  s'affichent en grand (« À toi, Léa ! »). Marche dans tous les jeux à manches, Grand Jeu compris
  (pas le défi du jour, une seule carte). « Autre mot » garde le même enfant.
- Les étoiles restent **communes** ; la partie note seulement qui a joué chaque manche
  (`turns` de la partie, sur l'appareil). Aucun score par enfant, aucun classement nulle part.
- Avec un seul joueur actif (ou aucun), « Chacun son tour » se joue comme en équipe.
- La rotation est une fonction pure (`src/games/turns.ts` : `startOrder`, `turnAt`, `rotation`),
  réutilisée pour les équipes.

## Jouer en équipes (#44)

- Pour un anniversaire ou une réunion de cousins : lien **Jouer en équipes** sur l'accueil
  (écran `#/equipes`, derrière le verrou parent s'il est activé).
- **2 ou 3 équipes**, chacune avec un nom (proposés : Les Renards, Les Grenouilles, Les Dauphins ;
  20 caractères) et une couleur parmi les 6 des avatars, différente pour chaque équipe.
- Les joueurs du jour sont placés d'office ; les autres enfants de la famille s'ajoutent d'un
  appui, et les **invités** par leur prénom seul : ils ne sont **pas** ajoutés aux joueurs de la
  famille. **12 enfants** au plus, toutes équipes confondues. Un nouvel enfant rejoint l'équipe la
  moins nombreuse ; toucher un prénom le fait passer dans l'équipe suivante, la croix le retire.
  Changer le nombre d'équipes ou « Mélanger les équipes » répartit tout le monde au hasard, à un
  près. « C'est parti ! » demande au moins un enfant par équipe.
- Les équipes (invités compris) restent sur le téléphone, d'une partie à l'autre, jusqu'à
  **Arrêter** (accueil ou écran des équipes). Elles ne vont pas dans la sauvegarde.
- En partie, les équipes jouent **à tour de rôle** (même rotation que « Chacun son tour », ordre
  tiré au sort au lancement, qui remplace le tour par tour individuel) : en haut de la manche,
  « À vous, Les Renards ! » sur la couleur de l'équipe, avec ses étoiles. Le compteur en haut
  reste le **total commun**. Tous les jeux à manches, Grand Jeu compris (pas le défi du jour).
  Les cartes suivent le niveau de la partie.
- Fin de partie : le total commun en grand (« 7 étoiles gagnées ensemble ! »), puis « Bravo à
  toutes les équipes ! » : chaque équipe fêtée, dans l'ordre de l'écran des équipes (jamais par
  score), avec ses étoiles si elle en a. Ni gagnant ni perdant.
- La partie enregistrée garde le **total commun** (il rejoint les étoiles de la famille), les
  enfants de la famille présents (pas les invités) et, pour chaque équipe, son nom, sa couleur,
  ses étoiles et son nombre d'enfants (`teams` de la partie). L'historique note « En équipes :
  Les Renards, Les Dauphins ». Module `src/games/teams.ts` (fonctions pures).

## Jeux

| Jeu                               | Règle proposée                                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quelle chanson ?**              | Extrait de 10 s, réécoutable. Indice visible, titre caché derrière « Voir la réponse », puis « Chanter ensemble ». Voir « Contenu des chansons ».         |
| **Quelle lettre, quel chiffre ?** | Lettres, chiffres, nombres ou constellations (voir ci-dessous), tirés au hasard sans répétition dans la partie. Consigne parent associée à chaque glyphe. |
| **Dessine ça**                    | Minuteur de **60 s** ; à zéro, le dessin reste visible et le parent valide. Pas de note du dessin : « C'est fini » = +1 étoile.                           |

### Lettres et chiffres (#48)

- Sélecteur en trois colonnes de grands boutons, à portée du pouce : **Majuscules**,
  **Minuscules**, **Attaché** ; **Chiffres** (0-9), **Nombres** (10 à 20, puis les dizaines
  jusqu'à 100), **Dés, doigts** ; puis **Mélange** sur toute la largeur (toutes les familles).
- Constellations, à dénombrer d'un coup d'œil : points du dé (1 à 6) et doigts levés (1 à 10,
  deux mains au-delà de 5, comptés à la française : le pouce d'abord). Dessinés par l'appli
  (SVG), aucun fichier image.
- Chaque glyphe garde une consigne pour le parent : celles des minuscules et de l'attaché
  reprennent le mot de la majuscule (« C'est le « a » des petites lettres. … ») ; nombres, dés et
  doigts ont la leur (`nombres.json`, `des.json`, `doigts.json`). Minuscules et attaché sont un
  niveau au-dessus de leur majuscule.
- « Répondre en montrant » tire les choix dans la même famille (un dé parmi des dés).
- Écriture attachée : police **Playwrite FR Moderne** (TypeTogether, modèle de cursive des
  écoles françaises), licence **SIL Open Font License 1.1** (Google Fonts,
  `ofl/playwritefrmoderne`), installée comme les autres polices par le paquet
  `@fontsource/playwrite-fr-moderne` (graisse 400). Embarquée dans le build et mise en cache par
  le service worker : elle marche hors ligne, aucune requête vers Google.
- Le Défi du jour et le Grand Jeu gardent les majuscules et les chiffres.

### Le son des lettres (#50)

- En maternelle, on travaille le **son** de la lettre avant son nom. Pour chaque lettre
  (majuscule, minuscule ou attachée), « Pour le parent » donne : le son écrit (« mmm », comme
  au début de maison), **trois mots illustrés** d'un emoji, et une **question à poser**, tirée
  au hasard à chaque manche : « Trouve un mot qui commence par “mmm”. » ou « Qu'est-ce qui
  commence comme maison : 🏍️ moto ou 🍓 fraise ? » (avec un **intrus** et la réponse pour le
  parent).
- Les mots commencent **vraiment** par le son annoncé : pas de « ch » sous le C (canard, pas
  cheval), pas de « ou » sous le O, pas de « h » muet sous une voyelle. Le E se dit « é »
  (éléphant). Le H ne s'entend pas : il garde ses mots (hibou), mais pas de son à écouter ni à
  comparer ; la question porte sur l'écrit. Le W se dit « ou » (wapiti), le X « ks » ou « gz ».
  L'intrus commence par un son bien différent (jamais « ch » face au S, ni « f » face au V).
- **Écouter les mots** : la voix française du téléphone (celle de « Lire ») dit les trois mots,
  l'un après l'autre ; une voix de synthèse ne sait pas dire un son seul. Sans voix locale, le
  bouton n'apparaît pas : tout est écrit et le parent lit.
- Contenu dans `src/games/lettres/sons.ts` (une lettre par ligne), vérifié par les tests :
  26 lettres, trois mots par lettre, chaque mot commence par sa lettre sans début piège.

### Tracer au doigt (#49)

- Avec **Majuscules** ou **Chiffres**, le bouton **Tracer au doigt** (appuyé / non appuyé)
  remplace le glyphe par son modèle en **pointillés**, que l'enfant repasse du doigt. Le choix
  est gardé d'une manche à l'autre et après un rafraîchissement (pas dans le Mélange, ni pour
  les minuscules, l'attaché, les nombres et les constellations).
- Chaque trait a son **point de départ** (pastille numérotée 1, 2, 3 dans l'ordre d'écriture)
  et une **flèche** qui donne le sens. **Voir le tracé** anime les traits l'un après l'autre
  (tout d'un coup avec « réduire les animations ») ; la démonstration s'efface dès que
  l'enfant touche le dessin.
- Trait **large** (22 px), sans contrôle de précision : **pas de note automatique**. Le parent
  regarde et valide (**C'est tracé** = +1 étoile, ou **Passer**). Annuler le dernier trait et
  Tout effacer, comme dans Dessine ça ; le tracé n'est jamais enregistré.
- Le modèle est posé **par-dessus** le dessin et laisse passer le doigt : il reste visible
  sous le doigt et au-dessus du trait de l'enfant.
- **Gauchers** : consigne et boutons sont **au-dessus** de la zone de dessin, centrés ; rien
  n'est placé à côté ni en dessous, là où une main droite ou gauche se pose.
- Modèles dessinés pour l'appli (`src/games/lettres/trace.ts`) : un chemin SVG par trait, dans
  l'ordre des lettres bâton de l'école (de haut en bas, de gauche à droite, les ronds dans le
  sens inverse des aiguilles d'une montre). Aucun fichier, aucune police, aucun droit tiers.
  La zone de dessin est celle de Dessine ça (`DrawingCanvas`, #51).

### Outils de dessin (#51)

- Sous le dessin, **une seule ligne de cinq boutons** de 48 px (tient sur un écran de 320 px) :
  **Couleur**, **Épaisseur**, **Gomme**, **Annuler le dernier trait**, **Tout effacer**.
- **Couleur** ouvre une palette de **8 couleurs** (noir, vert, bleu, or, rouge, rose, violet,
  marron, qui suivent le thème jour / nuit) ; **Épaisseur** en ouvre trois (fin, moyen, épais ;
  moyen par défaut). Elles s'ouvrent au-dessus de la ligne et se referment au choix, en touchant
  le dessin ou avec Échap. Choisir une couleur quitte la gomme.
- **Gomme** : le doigt efface, trois fois plus large que l'épaisseur choisie.
- **Annuler** retire le dernier trait (un trait de gomme compris), autant de fois qu'on veut ;
  grisé quand il n'y a plus rien, comme « Tout effacer ».
- Le dessin est gardé comme une **liste de traits** (points, couleur, épaisseur, gomme) et
  redessiné à partir d'elle (`src/games/dessin/strokes.ts`, fonctions pures) : après une
  **rotation** ou un redimensionnement, il est retracé net à la nouvelle taille, en entier,
  sans être déformé (réduit et centré si la zone rétrécit). Le tracé est **lissé** (courbes qui
  passent par les milieux des points).
- Les mêmes outils servent dans Dessine ça, les mots à dessiner créés, le Grand Jeu et le Défi
  du jour. Temps écoulé : dessin et outils figés, le parent valide.
- Le dessin disparaît au mot suivant, sauf si le parent l'a gardé (ci-dessous).

### Dessins gardés (#52)

- Dès le premier trait, un bouton **« Garder »** apparaît dans le coin du dessin (Dessine ça, mots
  à dessiner créés, Grand Jeu), y compris quand le temps est écoulé. Le dessin part dans la
  galerie et le bouton devient « Gardé » ; si l'enfant continue, « Garder » revient et met à
  jour le **même** dessin. Rien n'est gardé sans ce geste (pas de conservation automatique).
- Ce qui est gardé : l'image **PNG** du dessin tel qu'il est à l'écran, sur le fond de la zone de
  dessin (clair le jour, sombre la nuit), au plus 1280 px de côté ; le **mot** ; la **date** ;
  l'**enfant** de la manche en « chacun son tour », sinon les joueurs actifs. Table IndexedDB
  `drawings` (version 6 de la base).
- **Galerie** : espace Parent → « Dessins gardés » (derrière le verrou parent). Les plus récents
  d'abord, avec mot, prénom(s) et date ; un dessin s'ouvre en grand, avec **Partager l'image**
  (partage Android, sinon téléchargement `dessin-<mot>-AAAA-MM-JJ.png`) et **Supprimer**
  (confirmé). Rien n'est partagé sans ce bouton.
- **Limite** : 200 dessins. À partir de 150, la galerie propose de supprimer les 50 plus anciens
  (confirmé) ; à 200, « Garder » affiche « Galerie pleine ». Nombre et place prise sont affichés.
- Les dessins sont dans la **sauvegarde complète** (image en base64) ; « Effacer toutes les
  données » vide la galerie ; « Remettre les étoiles à zéro » n'y touche pas.
- Le Défi du jour ne propose pas « Garder ».

### Façons de jouer (#53)

- Au-dessus du mot, quatre choix sur une ligne (« Façon de jouer ») : **Classique** (le jeu
  habituel), **Mystère**, **À deux**, **Yeux fermés**. Chaque variante est précédée de son
  explication d'une phrase, sous le sélecteur. Le choix reste d'une manche à l'autre et après un
  rafraîchissement ; une nouvelle partie repart en Classique.
- **Dessin mystère** : le mot s'affiche « pour l'enfant » (lu par la voix s'il ne lit pas
  encore) ; **Cacher le mot** le masque d'un geste avant de rendre le téléphone, **Voir le mot**
  le découvre quand le parent a proposé. Le mot suivant s'affiche de nouveau pour l'enfant. Le
  parent valide avec **Deviné** (+1 étoile) ou **Passer**.
- **Dessin à deux** : un trait chacun ; la phrase sous le dessin dit à qui le tour (« Au tour de
  Léa : un trait », puis « Au tour du parent »). L'enfant commence ; annuler un trait rend la main.
- **Les yeux fermés** : on dessine les yeux fermés, puis on rit ensemble du dessin.
- Les variantes gardent la zone de dessin, les outils, « Garder » et le minuteur (aucun en mode
  Coucher). Dessine ça et les mots à dessiner créés les proposent ; le Grand Jeu et le Défi du
  jour restent en Classique.

### Contenu de Dessine ça (#54)

- **150 mots** dans le pack `src/content/dessin.json`, écrits pour l'appli, 25 par **thème** :
  animaux, maison, nature, nourriture, véhicules, imaginaire.
- Chaque mot a un **niveau** : formes simples pour les Petits (un ballon, une pomme, un fantôme),
  objets à plusieurs parties pour les Moyens (une voiture, une pieuvre), animaux plus difficiles
  et **scènes** pour les Grands (« Un chat qui dort », « Un bateau sur les vagues »).
- Les tests refusent un mot sans thème, un doublon et une scène hors du niveau Grands.

### Contenu des chansons

- Uniquement des **airs traditionnels ou du domaine public** : 43 airs (Frère Jacques, Une souris
  verte, Il est né le divin enfant, la Marche turque…), dans le pack `src/content/chansons.json`.
- Chaque air note sa **source** (auteur mort depuis plus de 70 ans, ou air traditionnel) et un
  **thème** : comptine, Noël ou classique. Les tests refusent un air sans source ni thème.
- Paroles (#117) : seulement quand elles sont elles aussi du domaine public (traditionnelles,
  ou d'un auteur mort depuis plus de 70 ans), et la source le dit (« air et paroles
  traditionnels… »). Un air ancien reste libre même quand des paroles françaises récentes
  existent (« Vive le vent ») : on joue alors l'air, sans ses paroles.
- **Chanter ensemble** (#117) : une fois la réponse vue (« Voir la réponse »), ou la bonne
  image touchée en « Répondre en montrant », un bouton « Chanter ensemble » remplace l'extrait
  par l'**air en entier** (même instrument, même accompagnement), avec les **paroles du premier
  couplet** en grand quand la carte en a (champ `lyrics`, 13 airs dont « Une souris verte »,
  « Frère Jacques », « Au clair de la lune »). Les paroles reçoivent le focus : TalkBack les
  lit. Sans paroles, l'air se joue quand même (« fredonnez-le ensemble »). C'est un bonus :
  « Trouvé » et « Pas encore » restent là, et la manche suivante coupe l'air ; « Revenir à
  l'extrait » l'arrête aussi. Toujours aucun enregistrement chanté, rien à télécharger.
- L'air noté (`melody`) est l'air entier, une minute au plus : l'extrait en joue les
  10 premières secondes. Les tests vérifient que l'air d'une carte à paroles couvre tout le
  couplet (à peu près une note par syllabe).
- Les mélodies sont **jouées par un petit synthétiseur** dans l'appli (Web Audio), à partir
  d'une notation texte : aucun enregistrement, donc pas de droits d'interprète ni de fichier
  audio à télécharger, et le jeu marche hors ligne.
- **Instruments** (#46) : boîte à musique, flûte, piano ou xylophone, tiré au hasard à chaque
  manche (gardé pour l'air ralenti) et affiché sous le lecteur (« Joué à la flûte »). Chacun est
  une somme de quelques ondes douces (sinus, triangle), sans harmonique au-dessus de 2,5 kHz, qui
  reste sous le plafond de la sortie même avec l'accompagnement : doux à plein volume sur un
  haut-parleur de téléphone. Moteur commun aux jeux musicaux : `src/audio/instruments.ts`.
- **Accompagnement** facultatif : bouton « Accompagnement » sous le lecteur (éteint par défaut),
  qui ajoute un bourdon doux sur la tonique de l'air (sa dernière note), dans l'octave grave.
  L'activer ou l'éteindre remet l'extrait au début ; pause et reprise le gardent.
- **Façons d'écouter** (#47) : sélecteur en haut du jeu, choisi par le parent et gardé d'une
  manche à l'autre (« L'extrait » par défaut). Chaque façon s'explique en une phrase sous le
  lecteur :
  - **L'extrait** : les 10 premières secondes de l'air ;
  - **Petit à petit** : 3 notes, puis 5, puis 10 (bouton « Encore des notes »), puis l'extrait ;
  - **Au ralenti** (tempo × 0,7) ou **En accéléré** (tempo × 1,4) : les mêmes notes ;
  - **Le rythme seul** : toutes les notes sur la tonique de l'air, même rythme ;
  - **Au hasard** : une de ces façons tirée au sort à chaque manche.
    Toutes passent par `schedule` et le même lecteur (`src/games/chanson/variants.ts`). L'indice
    « air ralenti » ralentit encore la façon choisie. Toujours une étoile par manche trouvée. Le
    Grand Jeu et le Défi du jour jouent l'extrait, sans sélecteur.
- Chaque partie tire 10 chansons différentes.

### Jeux du catalogue

Le parent les ajoute depuis « Ajouter un jeu » (bouton Ajouter / Ajouté) ; ils apparaissent
alors sur l'accueil. Ils suivent le même déroulé (manches, étoiles) et un format commun de
cartes : réponse, indice, et selon le jeu une question, un bruit, un emoji ou une couleur.

| Jeu                  | Règle proposée                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Quel animal ?**    | Le **parent imite le cri** affiché (« Meuh ! ») et l'enfant devine ; « Écouter le cri » fait entendre le vrai (#118, voir plus bas). |
| **Quelle couleur ?** | Une pastille de couleur en grand, l'enfant la nomme.                                                                                 |
| **Mime ça**          | L'écran montre à l'enfant ce qu'il doit mimer (emoji + consigne), le parent devine.                                                  |
| **Devinettes**       | Le parent lit l'énigme, la réponse est cachée derrière « Voir la réponse ».                                                          |

#### Vrais cris et photos (#118)

- Chaque animal de « Quel animal ? » a un **vrai cri enregistré** et une **photo**. L'imitation
  par le parent reste la façon de jouer : le bouton « Écouter le cri » vient en plus, sous l'oreille.
  Il est joué comme un enregistrement du parent (sortie commune, niveau commun) et s'arrête au
  changement de manche ou quand on quitte le jeu.
- La photo ne s'affiche **jamais avant la réponse** (elle la donnerait) : elle remplace l'oreille
  après « Voir la réponse », et après « Trouvé » elle s'affiche 3 secondes par-dessus la manche
  suivante (un appui la ferme). « Passer » ne la montre pas. Même chose dans le Grand Jeu et le
  Défi du jour. L'emoji reste le repli d'une carte sans photo.
- Uniquement des fichiers libres, **CC0 ou domaine public** (sons de Freesound et Wikimedia
  Commons, photos de Flickr et Wikimedia Commons) : source, auteur, licence et retouches de
  chaque fichier dans `src/content/media/credits.json`.
- Fichiers embarqués dans l'appli et mis en cache par le service worker : tout marche hors ligne,
  rien ne part du téléphone. Sons en WAV mono 16 kHz (1 à 3,5 s ; environ 1 s pour les
  22 animaux ajoutés ensuite, pour tenir dans le plafond), photos WebP 480 × 360 : environ 2,9 Mo
  pour les 40 animaux (plafond de 3 Mo vérifié par les tests, presque atteint).
- Une carte sans fichier garde le fonctionnement d'avant.

Contenu (#55) : 40 animaux, 22 couleurs (dont des nuances pour les grands : bleu marine,
turquoise, bordeaux…), 40 mimes et 50 devinettes, écrits pour l'appli.

### Cartes déjà vues (#55)

- L'appli retient, pour chaque jeu, quand chaque carte a été montrée pour la dernière fois
  (jeux de base, catalogue et jeux créés). Une nouvelle partie sert d'abord les cartes **jamais
  vues**, puis les plus anciennes : deux parties de suite n'ont aucune carte commune tant qu'il
  en reste de nouvelles (4 parties de 10 manches sans doublon avec 40 mimes).
- Avec un niveau : une carte neuve du niveau voisin passe avant une carte déjà vue du bon niveau ;
  une carte à deux niveaux d'écart (Grands pour les Petits) reste toujours en dernier.
- Une carte compte comme vue dès qu'elle est affichée. Le Grand Jeu et le Défi du jour gardent
  leur propre tirage.
- Mémoire gardée sur le téléphone (table des réglages, clé `seenCards`), hors sauvegarde ;
  « Effacer toutes les données » l'efface.

### Le Grand Jeu (#41)

- Tuile « Le Grand Jeu » en tête de la grille de l'accueil (`#/jeu/grand-jeu`).
- Chaque manche tire un jeu parmi ceux de l'accueil (de base, catalogue ajoutés, jeux créés qui
  ont au moins une carte), puis une carte de ce jeu. Les jeux passent chacun leur tour dans un
  ordre mélangé : **jamais deux manches de suite dans le même jeu** ; dans un jeu, pas de carte
  répétée tant qu'il en reste.
- Un **écran-éclair** annonce le jeu de la manche (« Maintenant : Mime ça ! ») ; il passe tout seul
  après 2 s, ou d'un appui sur « C'est parti ! ».
- Chaque manche se joue comme dans son jeu : indices, réponse cachée, et **minuteur** pour les
  manches de dessin (« Autre mot » pris dans le même jeu).
- Nombre de manches : le réglage de l'espace Parent. La partie est enregistrée sous l'identifiant
  `grand-jeu` (« Le Grand Jeu » dans l'historique) et reprend après un rafraîchissement.
- **Niveau de la partie** (#40) : dans chaque jeu, les cartes du niveau choisi sur l'accueil
  passent d'abord, puis les niveaux voisins, comme dans les autres jeux.
- **Jeux inclus** : choisis dans l'espace Parent (« Le Grand Jeu », boutons Inclus / Inclure),
  mémorisés (réglage `grandExcluded` : les jeux retirés ; un jeu ajouté ensuite est inclus
  d'office). Au moins deux jeux restent inclus.

### Créer mon propre jeu

- Nom (30 caractères), type choisi à la création : **Son**, **Image**, **Mot à dessiner** ou **Question**.
- Cartes (50 maximum) : réponse, indice facultatif et phrase « Pour prolonger » facultative
  (100 caractères, sauf mot à dessiner), plus selon le type :
  - Son : un **enregistrement** au micro (10 s maximum), que le parent fait écouter à chaque
    manche (« Écouter le son »), ou un bruit à imiter par le parent ;
  - Image : une **photo** de l'appareil (réduite à 1280 px) ou un texte à montrer ;
    « Ajouter une photo » ouvre le choix d'Android (galerie ou appareil photo). La photo est
    réduite à 1280 px et recopiée en JPEG dans la base (jamais le fichier d'origine, qui peut
    devenir illisible). Une même photo peut être reprise. Si elle ne peut pas être lue (format
    inconnu, HEIC…), est trop lourde (plus de 5 Mo sans réduction possible) ou si le téléphone
    est plein, un message le dit ; « Ajouter la carte » attend la fin de la préparation.
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
  avec joueurs, parties, réglages, jeux créés (photos et sons en base64, au même format que les
  fichiers de jeu) et dessins gardés (PNG en base64 ; champ absent des sauvegardes plus anciennes,
  qui restent lisibles). Format `dis-moi/sauvegarde`, version 1. Même canal que le partage d'un jeu :
  partage Android, sinon téléchargement.
- **Restaurer une sauvegarde** : le fichier est entièrement vérifié avant toute écriture (format,
  version, chaque joueur, partie et jeu, 200 Mo maximum) ; un fichier refusé ne change rien. Le
  parent voit le contenu et choisit :
  - **Tout remplacer** : les données du téléphone sont remplacées à l'identique ;
  - **Fusionner** : la sauvegarde s'ajoute sans doublon (joueurs reconnus par leur prénom, parties
    par leur jeu et leur heure de début, jeux créés par leur type, leur date et leurs réponses,
    dessins par leur mot et leur date) ;
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
- Données gardées : jeu, date, manches jouées, étoiles, joueurs actifs au lancement (sur l'appareil uniquement).

## Sons d'interface

- Petits sons **synthétisés** dans l'appli (Web Audio), comme les mélodies : aucun fichier audio,
  donc aucun droit à gérer, et ils marchent hors ligne.
- **Trouvé** : un petit arpège montant ; **Passer / Pas encore** : une seule note douce, jamais un
  son d'échec ; **fin du minuteur** de Dessine ça : deux tintements ; **fin de partie** : un arpège
  complet ; **récompense débloquée** (1, 10, 25… étoiles) : un arpège plus long.
- Un seul contexte audio pour toute l'appli (`src/audio/context.ts`), relancé au réveil du
  téléphone. Un son d'interface ne couvre jamais une mélodie, un son enregistré ou une lecture à
  voix haute en cours : il n'est alors pas joué.
- Réglage **Sons** (activés par défaut) dans l'espace Parent ; coupés, aucun son d'interface.

## Félicitations parlées

- Au **Trouvé**, une félicitation dite à voix haute, tirée au hasard sans redire la précédente
  (« Bravo ! », « Super ! », « Bien joué ! », « Génial ! », « Trop fort ! ») ; en **fin de
  partie**, une phrase de fête : « Vous avez gagné 7 étoiles ensemble ! » (« Bravo d’avoir joué
  ensemble ! » sans étoile). Jamais rien sur **Pas encore / Passer**.
- Dites par la même voix française **installée sur le téléphone** que la lecture à voix haute
  (module `src/voice/praise.ts`), sans réseau.
- Le parent peut **enregistrer ses propres félicitations** au micro dans l’espace Parent
  (5 maximum, 10 s chacune) : elles remplacent alors la voix du téléphone. Elles sont jouées comme
  tout enregistrement du parent, au niveau commun (`playRecording`, voir « Volume »), restent dans
  le téléphone (IndexedDB, table `praises`), ne vont ni dans la sauvegarde ni dans un jeu
  partagé, et partent avec « Effacer toutes les données ». Chacune peut être réécoutée ou
  supprimée (après confirmation) ; une félicitation supprimée n’est plus jamais jouée.
- Sans voix française locale ni enregistrement, la fonction n’est pas proposée : l’espace Parent
  propose seulement d’enregistrer (si le micro existe).
- La félicitation ne retarde rien : elle part après le son d’interface, la manche suivante déjà
  affichée. Elle n’est pas dite si une mélodie, un son de carte ou une lecture est en cours, et
  s’arrête si l’un d’eux démarre. Quitter ou rejouer la partie la coupe.
- Réglage **Félicitations parlées** (activées par défaut) dans l’espace Parent, indépendant du
  réglage **Sons**. Ton unique pour l’instant (l’adaptation à l’âge viendra avec les niveaux).

## Volume (#121)

- Tout le son de l'appli (mélodies, sons d'interface, enregistrements du parent, futurs fichiers
  audio) passe par une **sortie unique** : un **plafond** que rien ne dépasse (−6 dBFS, crêtes
  arrondies en douceur), puis le **volume de l'appli**.
- Réglage **Volume de l'appli** dans l'espace Parent : **Doux** (par défaut, moitié du niveau) ou
  **Normal**. Le volume du téléphone reste celui choisi par la famille.
- Chaque son démarre par une **montée douce** (20 ms au moins) : jamais d'attaque brutale.
- Les **enregistrements du parent** (sons des jeux créés, félicitations) sont mesurés puis ramenés
  au même niveau à la lecture : un enregistrement crié est baissé, un murmure légèrement remonté
  (×4 au plus). Fonction commune : `playRecording(blob)` de `src/audio/recording.ts`.
- Si le téléphone ne sait pas décoder un enregistrement par Web Audio (format du micro
  Android, par exemple `audio/webm;codecs=opus` ou `audio/mp4`), il est lu par un élément
  `<audio>` branché sur la même sortie, au gain borné d'un son mis à niveau. Si rien ne peut être
  lu, le bouton reste là et un message invite à réessayer (ou à faire le bruit soi-même). Après un
  enregistrement au micro, le contexte audio est recréé : sur Android, celui ouvert pendant le
  micro peut rester réglé comme un appel (écouteur, volume très bas).
- **Fichiers audio** livrés avec l'appli (`src/`, `public/`) : en WAV, normalisés au moment de
  l'ajout à −22 dBFS efficaces (± 3 dB, silences ignorés), crête sous −1 dBFS. Le test de contenu
  `src/content/audio.test.ts` le vérifie pour chaque fichier et indique le gain à appliquer.
- La **lecture à voix haute** (synthèse vocale du téléphone) ne passe pas par cette sortie : elle
  suit seulement le volume de l'appli (moitié en « Doux »), que certains téléphones ignorent.

## Public visé (proposition)

- **3 à 7 ans**, en trois **niveaux par âge** (#40) : **Petits** (3-4 ans), **Moyens** (5-6 ans),
  **Grands** (7 ans et plus). Module `src/games/levels.ts`.
- Chaque carte du contenu intégré a un niveau (champ `level` des packs, vérifié par les tests) ;
  les cartes des jeux créés par le parent n'en ont pas et conviennent à tous.
- Chaque joueur peut avoir un niveau (écran Joueurs, facultatif). En équipe, le **niveau de la
  partie** se choisit sur l'accueil : **Tous** (par défaut, toutes les cartes comme avant),
  Petits, Moyens ou Grands. Il s'applique à la partie suivante.
- Un tirage ne manque jamais de cartes : les cartes du niveau choisi passent d'abord, puis celles
  du niveau voisin (le plus facile d'abord à égale distance), puis les autres.
  Les cartes jamais vues passent avant (voir « Cartes déjà vues »).
- Chacun son tour : chaque carte est tirée au niveau de l'enfant dont c'est le tour (repli sur le
  niveau voisin comme ci-dessus) ; un enfant sans niveau suit le niveau de la partie.
- Interface en **français uniquement** pour la v1.

## Espace Parent (proposition)

- Joueurs, jeux, dessins gardés, thème (auto / jour / nuit), **manches par partie** (5, 10 ou 15),
  **minuteur de Dessine ça** (30 s, 1 min, 1 min 30), **jeux du Grand Jeu**, **sons** (activés / désactivés), **volume de l'appli** (doux / normal), **félicitations parlées**, **défi du jour**, **vibrations**, remise à zéro des étoiles,
  effacement de toutes les données. Chaque action destructive demande confirmation.
- Les réglages s'appliquent à la partie suivante.
- **Vibrations** (activées par défaut), sur les téléphones qui le permettent (Android) :
  une impulsion courte sur « Trouvé », deux à la fin du minuteur de Dessine ça (le dessin est
  alors figé), un petit motif de fête en fin de partie. Jamais pendant que l'enfant dessine.
  Chaque impulsion dure au moins 80 ms : plus courte, beaucoup de téléphones ne la font pas
  sentir. Sans API de vibration (iPhone, Firefox), le réglage n'est pas proposé et l'espace
  Parent l'explique. Sinon, un bouton **« Essayer »** fait vibrer tout de suite, pour vérifier
  les réglages du téléphone : Chrome ne vibre pas en mode silencieux ni quand les vibrations
  sont coupées dans le téléphone, et n'accepte de vibrer qu'après un premier toucher sur la
  page (c'est toujours le cas en jeu). Un ordinateur sans vibreur ne vibre simplement pas.
- **Verrou parent** (désactivé par défaut) : quand il est activé, une petite addition
  (« 7 + 5 = ? », résultat entre 10 et 18) est demandée avant l'espace Parent, les joueurs,
  l'ajout et l'édition des jeux, y compris en tapant l'adresse. Les jeux restent libres.
  Une mauvaise réponse affiche une autre opération. Le déverrouillage vaut **5 minutes**,
  prolongées à chaque écran parent ouvert ; l'échéance n'est vérifiée qu'en changeant
  d'écran (jamais au milieu d'une modification). Un rafraîchissement le garde, fermer
  l'onglet ou l'appli reverrouille.
- **Durée d'une séance** (désactivée par défaut ; 10, 15, 20 ou 30 minutes) : le temps compte
  à partir du premier jeu lancé et repart à zéro après une pause de plus de 30 minutes. Une
  partie à l'avance, l'écran de fin annonce « Encore une partie, et après on range » (la
  dernière partie est prévue d'après la durée de la précédente, 5 minutes sinon). À
  l'échéance, la partie en cours va jusqu'au bout, puis vient la fin en douceur : « C'était la
  dernière partie ! », un dernier bravo, une respiration, « On range le téléphone ? ».
  L'accueil ne propose plus alors que « Revenir plus tard », et un jeu ouvert par l'adresse
  ne démarre pas. Le parent peut prolonger de 10 minutes ou repartir sur une nouvelle séance
  depuis son espace (derrière le verrou parent s'il est activé). Aucun compte à rebours à
  l'écran. Le temps est gardé sur le téléphone : ni un rafraîchissement ni la fermeture de
  l'appli ne le remettent à zéro.

## Lecture à voix haute

- Bouton **« Lire »** sous la question (jeux à questions, Devinettes), le mot (Dessine ça, mots à
  dessiner) et la consigne (Quelle lettre, quel chiffre ?), lu par la synthèse vocale du téléphone
  (`speechSynthesis`, module `src/voice/speech.ts`). Un second appui arrête la lecture.
  Même voix pour **« Écouter les mots »** du son des lettres (#50).
- Seule une voix française **installée sur le téléphone** est utilisée (`localService`) : une voix
  en ligne enverrait le texte à un serveur. Sans voix française locale, le bouton n'apparaît pas et
  l'espace Parent l'explique.
- La lecture s'arrête au changement de manche, avec « Autre mot » et en quittant la partie.
- Réglage dans l'espace Parent : vitesse **Normale** (par défaut) ou **Lente**, ou **Non** pour
  masquer le bouton.
- Pas de bouton sur ce que l'enfant doit deviner ou montrer (images, mime, bruits à imiter,
  indices et réponses du parent).

## Écrans

1. **Accueil** — titre « On joue à quoi ? », joueurs (pastilles « Qui joue ? » avec avatar et prénom, modifiables), grille des jeux,
   rappel de la dernière partie, barre de navigation _Jeux · Étoiles · Parent_.
   Cette barre reste collée au bas de l'écran : seul le contenu au-dessus défile, et le
   défilement s'arrête à la fin du contenu, sur toutes les pages (#145).
2. **Quelle chanson ?** — manche _n_ sur 10, compteur d'étoiles, façon d'écouter (#47), lecteur d'extrait (10 s),
   bloc parent avec titre caché + indice, bouton « Voir la réponse », puis « Chanter ensemble »
   (air entier et paroles).
3. **Quelle lettre, quel chiffre ?** — sélecteur Majuscules / Minuscules / Attaché / Chiffres /
   Nombres / Dés, doigts / Mélange, glyphe en grand
   (« Montre l'écran à l'enfant »), consigne parent, boutons Passer / Trouvé.
4. **Dessine ça** — minuteur, mot lu par le parent, zone de dessin au doigt et ses outils,
   boutons Passer / C'est fini.
5. **Ajouter un jeu** — catalogue (Quel animal ?, Quelle couleur ?, Mime ça, Devinettes)
   groupé par type, avec filtres (type, âge, moment) et bouton Ajouter / Ajouté, et formulaire
   « Créer mon propre jeu » (nom, type : Son / Image / Mot à dessiner / Question, ce que fait
   l'enfant, âge facultatif, puis ajout des questions).

## Principes produit

- Hors ligne d'abord : tout fonctionne sans réseau une fois l'appli installée.
- Aucune donnée ne quitte l'appareil (pas de compte, pas d'analytics, pas de pub).
- Thème jour / nuit, gros boutons (≥ 48 px), contrastes AA.
