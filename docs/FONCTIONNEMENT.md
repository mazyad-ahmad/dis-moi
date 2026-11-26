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

## Respire comme… (#126)

- Pour redescendre avant le coucher ou après une colère : carte **Respire comme…** sur
  l'accueil, à part des jeux (écran `#/respire`). Proposée aussi en fin de séance (« Respirer
  ensemble », sur l'écran de fin et dans « Revenir plus tard ») et en mode Coucher (« Respirer
  avant de dormir » sur l'écran de fin, phrase du coucher sur la carte).
- Quatre exercices en images (emoji, aucun fichier) : « Souffle comme le vent », « Respire
  comme un ours qui dort », « Gonfle un ballon », « Sens la fleur, souffle la bougie ».
- Une forme grossit quand on inspire (**3 s**) et rapetisse quand on souffle (**4 s**), sans
  pause entre les deux : jamais de souffle retenu. Le texte dit chaque temps (« On inspire »,
  « On souffle » et la phrase de l'exercice) : l'exercice marche sans son, et avec « réduire les
  animations » la forme reste immobile, le texte guide seul.
- Longueur selon l'âge, toujours entre 1 et 2 minutes : 9 respirations pour les Petits, 12 pour
  les Moyens, 15 pour les Grands, 10 sans niveau connu (le plus jeune des joueurs du jour, ou le
  niveau de la partie). Aucun minuteur ni compteur à l'écran : l'exercice se termine quand
  l'animation s'arrête. « Arrêter » revient au choix, sans rien enregistrer.
- Le parent fait l'exercice avec l'enfant ; à la fin, **une étoile gagnée ensemble**
  (partie « Respire comme… » dans l'historique). Mascotte endormie et « Bonne nuit » en mode
  Coucher, dont le thème nuit s'applique aussi à cet écran.
- **Son doux** facultatif, coupé par défaut (bouton sur l'écran, proposé si les sons de l'appli
  sont activés) : une note synthétisée qui monte à l'inspiration et redescend en soufflant, par la
  sortie commune (voir « Volume »). Aucune voix. L'écran reste allumé pendant l'exercice.
- Il ne compte pas comme une partie de la séance : il reste ouvert après la fin de séance.

## Façons de jouer (#42)

- Sur l'accueil, **Façon de jouer** : **Normal** (par défaut), **Express**, **Coucher** ou
  **Voiture**, avec une phrase qui dit ce que le mode change. Le choix est gardé d'une partie à
  l'autre (réglage `gameMode`, comme le niveau) et s'applique à la partie suivante.
- **Express** : 3 manches (ou moins si le réglage de l'espace Parent est plus court).
- **Coucher** : thème nuit imposé, volume doux imposé, pas de minuteur dans les dessins, pas de
  jeu qui fait bouger (Mime ça, Jacques a dit) ; la chasse au trésor s'y joue en version « sans courir ». Fin
  en douceur : ni confettis ni vibration de fête, la mascotte dort, « C'est l'heure de dormir.
  Bonne nuit ! », pas de bouton « Un autre jeu ».
- **Voiture** : seulement des cartes orales (Quelle chanson ?, Raconte-moi, Histoire à inventer, Quel animal ?, Devinettes,
  Vrai ou faux rigolo, Ça rime avec…, Les contraires, Tape les syllabes (en comptant à voix haute), jeux créés « Son » et « Question », chasse au trésor « sans courir ») ; rien à
  regarder ni à dessiner.
- L'accueil, le Grand Jeu, le Défi du jour et « Un autre jeu » ne proposent que les jeux qui
  conviennent au mode ; un jeu qui ne convient pas, ouvert par l'adresse, ne démarre pas.
- Règle commune (`src/games/modes.ts`, fonction pure `suitsMode`) : chaque jeu déclare ce qu'il
  demande à l'enfant (`needs` : regarder l'écran, bouger), d'après son type de cartes et, pour un
  pack, le champ `moves`. Un jeu qui fait bouger mais a une version sans bouger (champ `still`
  d'un pack, la chasse au trésor) est proposé au Coucher et en Voiture dans cette version
  (`playsStill`). Un jeu qui ne déclare rien n'est proposé ni au Coucher ni en Voiture.
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
- Pas de choix dans les jeux de dessin, dans Mime ça (ni Mime l’émotion) ni dans la Chasse au
  trésor, ni dans le Défi du jour. Ils marchent
  aussi dans le Grand Jeu.
- Chaque choix est un bouton d'au moins 64 px, nommé pour le lecteur d'écran (« La vache »,
  « Lettre A », « Rouge »). Images : emoji dessinés par la police du téléphone, aucun fichier.

## Image cachée (#62)

- Une image montrée d'un coup se devine en une seconde : en **Image cachée**, elle démarre
  méconnaissable et se précise par **5 paliers**. Le parent avance d'un palier à la fois avec
  « **Préciser l’image** » (« Palier 2 sur 5 », puis « Image nette »). **Trouvé** se donne à
  n'importe quel palier : l'étoile est la même, rien ne presse.
- Photo : réduite à 6, 12, 24 puis 48 carrés de large dans une toute petite toile, agrandie
  sans lissage (pixels bien visibles), puis la photo elle-même, nette. Un palier ne redessine
  que quelques centaines de pixels : fluide même avec une photo de 1280 px sur un petit
  téléphone. Emoji du catalogue : flou de 28, 16, 9, 4 px, puis net.
- Rien d'animé entre deux paliers : rien à couper avec « réduire les animations ». Le texte
  d'une carte (qui pourrait donner la réponse) n'apparaît qu'avec l'image nette.
- Option des jeux de type **Image** : proposée à la création d'un jeu Image (« Montrer
  l’image : D’un coup / Image cachée », d'un coup par défaut), gardée avec le jeu (champ
  facultatif `reveal`, aussi dans le fichier de jeu partagé et la sauvegarde). Dans l'espace
  Parent, section **Image cachée** : l'activer ou la couper pour chaque jeu Image créé et pour
  les jeux Image du catalogue qui s'y prêtent (aujourd'hui Quelle émotion ? ; ni les couleurs,
  ni les mimes, que l'enfant doit voir), réglage `revealCatalogue`.
- Pas avec les Ombres (#61), qui cachent déjà l'image : une carte en ombre n'est jamais en
  Image cachée, le jeu Ombres et les jeux créés joués en ombres ne sont pas proposés.
- Aussi dans le Grand Jeu (comme dans le jeu d'origine). Pas dans le Défi du jour (une seule
  carte surprise). En montrant, les choix remplacent l'image comme avant.
- Module `src/games/reveal/` (paliers : fonctions pures de `reveal.ts`).

## Raconte-moi (#125)

- Un jeu pour **se parler**, sans bonne réponse : « Qu’est-ce qui t’a fait rire aujourd’hui ? »,
  « Si tu étais un animal, lequel serais-tu ? ». Tuile **Raconte-moi** sur l’accueil (jeu de base,
  `#/jeu/raconte`), types Parler et Se calmer.
- **60 questions** ouvertes (`src/content/raconte.json`), 20 par niveau, sur quatre thèmes :
  Ma journée, Imaginer, Ma famille et mes amis, Mes goûts (le thème s’affiche au-dessus de la
  question). Relues pour qu’aucune ne soit intrusive ni anxiogène : ni secret, ni peur, ni
  comparaison avec d’autres enfants (liste de mots écartés vérifiée par les tests).
- Le parent lit la question (bouton « Lire »), l’enfant raconte, puis **le parent répond à son
  tour** : c’est un échange, rappelé dans « Pour le parent ». Pas de réponse cachée, pas d’indice.
- **Merci de m’avoir raconté** remplace « Trouvé » et donne l’étoile, gagnée ensemble.
  **Passer** change de question sans rien dire (la note douce habituelle) et ne retire jamais
  d’étoile. Une partie toute passée finit sur « Merci pour ce moment ensemble. On se racontera
  d’autres choses ! ».
- **Rien n’est enregistré** : pas de micro, pas de texte à écrire ; la partie ne garde que ses
  manches et ses étoiles, comme les autres jeux.
- Oral, il se joue en **Voiture** et au **Coucher**, en équipe, chacun son tour (question au
  niveau de l’enfant) ou en équipes. Pas dans le Grand Jeu ni le Défi du jour (ils demandent une
  bonne réponse), ni de « Répondre en montrant ».

## Voix rigolotes (#70)

- L'enfant dit une phrase proposée, puis **se réentend déformé** : robot, souris, géant ou écho.
  Tuile **Voix rigolotes** sur l'accueil (jeu de base, `#/jeu/voix`), types Parler et Écouter.
- **36 phrases** rigolotes avec une image (`src/content/voix.json`), 12 par niveau : courtes pour
  les Petits, plus folles pour les Moyens, virelangues pour les Grands.
- Deux défis en alternance : **Devine la voix** (manches impaires : le parent lit la phrase,
  l'enfant l'enregistre, « Écouter la voix surprise » la rejoue avec une voix tirée au hasard ;
  « Voir la voix » la dit au parent, puis les quatre voix se réécoutent) et **Devine ma phrase**
  (manches paires : l'écran montre la phrase à l'enfant, le parent se bouche les oreilles ; une
  fois enregistrée, la phrase se cache et l'enfant choisit la voix ; le parent devine la phrase,
  ou celle que l'enfant a inventée). **Trouvé** donne l'étoile, gagnée ensemble ; **Pas encore**
  passe sans rien retirer.
- **Micro** : demandé seulement au premier appui sur « Enregistrer la phrase », 8 s au plus, comme
  les autres enregistrements (contexte audio recréé ensuite, #141). Les effets sont calculés par
  Web Audio **sur le téléphone** (`src/games/voix/effects.ts`) : souris et géant changent la
  vitesse de lecture (× 1,6 et × 0,65, la voix monte ou descend), le robot module la voix par une
  note grave de 55 Hz, l'écho la répète tous les 0,28 s, de plus en plus bas.
- **Rien n'est gardé** : l'enregistrement ne vit que dans la manche, en mémoire. À la manche
  suivante, à la fin de la partie ou en quittant, la voix s'arrête et le son est oublié ; il
  n'est jamais écrit dans la base, dans la partie enregistrée ni dans l'onglet, jamais envoyé.
  Pas d'option pour le garder pour l'instant.
- **Volume limité** : le son est ramené au niveau commun (comme les enregistrements du parent),
  l'écho est baissé d'autant que ses répétitions s'ajoutent (la crête ne dépasse jamais celle
  d'un son mis à niveau), puis tout passe par la sortie commune : plafond et volume de l'appli
  (voir « Volume »), doux au coucher.
- **Sans micro** (refusé, absent, ou « Jouer sans micro ») : on fait les voix soi-même. Devine la
  voix : le parent dit la phrase avec la voix cachée (« Voir la voix à imiter », avec comment la
  faire), l'enfant devine. Devine ma phrase : l'enfant choisit une voix sans la montrer et dit la
  phrase avec, le parent devine la voix. « Jouer avec le micro » revient en arrière.
- L'enfant regarde l'écran (phrase, voix à choisir) : proposé au Coucher (volume doux imposé),
  pas en Voiture. Chacun son tour et en équipes comme les autres jeux. Pas dans le Grand Jeu ni
  le Défi du jour (il faut enregistrer), ni de « Répondre en montrant ».
- Voix : emoji dessinés par la police du téléphone, aucun fichier, aucun son livré, aucun droit tiers.

## Histoire à inventer (#68)

- Un jeu pour **raconter** : chaque manche tire **un héros, un lieu et un objet** (emoji et mots,
  « Un dragon · Au zoo · Une clé ») et une phrase de départ que le parent lit (« Il était une fois
  un dragon, au zoo, avec une clé… », bouton « Lire »). L’enfant invente la suite. Tuile
  **Histoire à inventer** sur l’accueil (jeu de base, `#/jeu/histoire`), type Parler.
- **108 images** (`src/content/histoire.json`, pack de type `story`) : 36 héros, 36 lieux et
  36 objets, 12 de chaque par niveau (Petits : animaux et lieux de tous les jours ; Grands :
  astronaute, autre planète, boussole…). Tirage au niveau de la partie, ou de l’enfant dont c’est
  le tour.
- Dans « Pour le parent », des **relances** (« Et après ? », « Qui arrive ? », « Comment ça se
  termine ? »…), jamais de correction : pas de bonne réponse.
- **Merci pour ton histoire** donne l’étoile, gagnée ensemble ; **Passer** tire d’autres images
  sans rien dire. Une histoire prend du temps : **5 manches au plus** (moins si le réglage ou le
  mode Express en prévoit moins). Une partie toute passée finit sur « Merci pour ce moment
  ensemble. On inventera d’autres histoires ! ».
- **Enregistrement facultatif** : « Enregistrer l’histoire », dans « Pour le parent », allume le
  micro (jamais tout seul, Android demande l’autorisation) ; « Arrêter l’enregistrement » ou
  3 minutes au plus. Changer de manche ou quitter le jeu pendant l’enregistrement l’arrête et
  garde l’histoire. Elle se réécoute aussitôt (« Réécouter l’histoire »). Sans micro, rien n’est
  proposé.
- **Livre d’histoires** (espace Parent) : les histoires enregistrées, la plus récente d’abord,
  avec leurs trois images et leur jour ; chacune se **réécoute** (au niveau commun,
  `playRecording`) et se **supprime** (après confirmation). 30 histoires au plus : au-delà, le jeu
  invite à en supprimer une. Elles restent dans le téléphone (IndexedDB, table `stories`), ne vont
  ni dans la sauvegarde ni dans un jeu partagé, et partent avec « Effacer toutes les données ».
- Oral (le parent lit les trois mots), il se joue en **Voiture** et au **Coucher**, chacun son
  tour ou en équipes. Pas dans le Grand Jeu ni le Défi du jour, ni de « Répondre en montrant ».

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

| Jeu                           | Règle proposée                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Quel animal ?**             | Le **parent imite le cri** affiché (« Meuh ! ») et l'enfant devine. Pas d'enregistrement de cris pour la v1 (droits) : à revoir si besoin. |
| **Quelle couleur ?**          | Une pastille de couleur en grand, l'enfant la nomme.                                                                                       |
| **Mime ça**                   | L'écran montre à l'enfant ce qu'il doit mimer (emoji + consigne), le parent devine.                                                        |
| **Devinettes**                | Le parent lit l'énigme, la réponse est cachée derrière « Voir la réponse ».                                                                |
| **Quelle émotion ?**          | Un visage (emoji) en grand, l'enfant nomme l'émotion. Voir « Les émotions ».                                                               |
| **Mime l’émotion**            | L'écran montre à l'enfant l'émotion à mimer (visage + consigne), le parent devine. Voir « Les émotions ».                                  |
| **Chasse au trésor**          | « Trouve quelque chose de rouge » : l'enfant cherche dans la maison, le parent valide l'objet. Voir ci-dessous.                            |
| **Vrai ou faux rigolo**       | Le parent lit une phrase, l'enfant crie « vrai » ou « faux ». Voir ci-dessous.                                                             |
| **Jacques a dit**             | Le parent lit une consigne ; sans « Jacques a dit », c'est un piège et l'enfant ne bouge pas. Voir ci-dessous.                             |
| **Ça rime avec…**             | « Trouve un mot qui rime avec _chat_ » : l'enfant cherche, le parent a des exemples. Voir ci-dessous.                                      |
| **Les contraires**            | « Le contraire de _grand_ ? » : l'enfant répond, le parent a les réponses acceptées. Voir ci-dessous.                                      |
| **Ombres**                    | Une silhouette noire, l'enfant devine ; « Voir la réponse » la montre en couleur. Voir ci-dessous.                                         |
| **L’intrus**                  | Quatre images, une ne va pas avec les autres : l'enfant la montre du doigt, le parent valide. Voir ci-dessous.                             |
| **Qu’est-ce qui a disparu ?** | Des objets à regarder, le parent les cache, en retire un (ou en ajoute un), les remontre : l'enfant dit ce qui a changé. Voir ci-dessous.  |
| **Compte avec moi**           | Des objets à compter, deux groupes à comparer, de petites additions et soustractions en images. Voir ci-dessous.                           |
| **Devine-tête**               | Le téléphone sur le front, l'enfant ne voit pas le mot : les autres le miment ou le décrivent. Voir ci-dessous.                            |
| **Tape les syllabes**         | Le parent dit un mot, l'enfant tape dans ses mains à chaque syllabe (« cho-co-lat » = 3). Voir ci-dessous.                                 |
| **Où ça va ?**                | Un élément (emoji et mot) et deux ou trois familles : l'enfant dit où il va et pourquoi, le parent valide. Voir ci-dessous.                |
| **Devine avec tes mains**     | Des objets dans un sac : on touche sans regarder, on décrit, on devine. Voir ci-dessous.                                                   |

### Les émotions (#58)

- Deux sens de jeu, deux jeux du catalogue tirés des mêmes 14 émotions : **Quelle émotion ?**
  (reconnaître) et **Mime l’émotion** (mimer). Des plus simples aux plus fines selon le niveau :
  Petits (joie, tristesse, colère, peur, surprise), Moyens (amour, dégoût, ennui, inquiétude,
  calme), Grands (fierté, jalousie, déception, gêne).
- Chaque émotion a une **question pour en parler** (« Quand est-ce que tu es fier de toi ? »),
  ouverte et bienveillante : jamais de « pourquoi », jamais de reproche. Elle apparaît dans le
  bloc parent avec la réponse (champ `talk` des packs), aussi dans le Grand Jeu et le Défi du jour.
- Mime l’émotion fait bouger (pas au Coucher) et n'a pas de choix « En montrant », comme Mime ça.
  Quelle émotion ? convient au Coucher ; en montrant, les visages au choix remplacent le visage.
- Visages : emoji dessinés par la police du téléphone, aucun fichier, aucun droit tiers.

### Chasse au trésor (#60)

- **60 consignes** « Trouve quelque chose… » sur les trois niveaux (20 chacun) : une couleur,
  une forme, une matière, puis pour les grands une lettre initiale ou deux critères à la fois
  (« rond et rouge »). Pack `src/content/catalogue-tresor.json`. Chaque carte donne au parent
  des idées d'objets, derrière « Un indice ». Rien de dangereux à rapporter (ni verre, ni objet
  lourd ou coupant).
- **Deux façons de chercher**, choisies en haut de la manche : **Partout** (« Va le chercher
  dans la maison, puis reviens le montrer ! ») ou **Sans courir**, pour le soir ou les petits
  espaces (« Sans te lever : cherche des yeux et montre-le du doigt »). Le choix est gardé pour
  la partie. Au **Coucher** et en **Voiture**, seule la version sans courir est jouée.
- **Minuteur facultatif** (même compte à rebours que Dessine ça, en pause écran éteint) : le
  parent le lance s'il veut, 1 min partout, 30 s sans courir, aucun au Coucher. À zéro, deux
  tintements et « Le temps est fini, ce n'est pas grave : le parent décide » ; **Trouvé**
  rapporte toujours l'étoile.
- **Musique d'attente** facultative (éteinte par défaut) pendant le minuteur : une petite boucle
  écrite pour l'appli, jouée par le synthétiseur des chansons (aucun fichier, aucun droit tiers),
  coupée à zéro et à la manche suivante.
- Pas de « Répondre en montrant » (l'enfant montre l'objet lui-même). Dans le Grand Jeu et le
  Défi du jour, la carte se joue avec sa consigne, partout (sans courir au Coucher et en
  Voiture) ; sans minuteur dans le Défi du jour.

### Vrai ou faux rigolo (#56)

- Jeu du catalogue, tout à l'oral : le parent lit une phrase, l'enfant crie « vrai » ou « faux ».
  Idéal pour les petits et pour la voiture (proposé en Voiture et au Coucher).
- 60 cartes (`src/content/catalogue-vrai-faux.json`), 20 par niveau, moitié vraies (elles
  apprennent quelque chose), moitié absurdes (« Les poissons portent des chaussettes »).
- « Voir la réponse » montre au parent Vrai ou Faux et une courte explication à lire. Pas
  d'indice « Ça commence par… » : il donnerait la réponse.
- En montrant : deux choix, 👍 Vrai et 👎 Faux, quel que soit le niveau. Même règle pour toute
  carte question dont la réponse commence par « Vrai » ou « Faux », jeux créés compris
  (`src/games/vraifaux/verdict.ts`).

### Jacques a dit (#57)

- Jeu de mouvement du catalogue : le parent lit la consigne à voix haute (« Jacques a dit :
  touche ton nez. »). Avec « Jacques a dit », l'enfant la fait ; sans, c'est un piège, il ne
  bouge pas. Une étoile quand l'enfant ne se fait pas piéger (Trouvé) ; piégé, on rit et on
  continue (Pas encore).
- 50 consignes (`src/content/catalogue-jacques.json`), dont 17 pièges (un tiers), réparties par
  niveau : gestes simples pour les petits, équilibre et gestes à deux temps pour les moyens,
  droite et gauche pour les grands. Rien de dangereux ni d'impossible en appartement : sur place,
  sans courir, sauter ni grimper, sans meuble (vérifié par un test).
- L'écran dit tout de suite au parent si c'est un piège (✅ Jacques a dit / ⚠️ Piège !) et ce qui
  rapporte l'étoile : pas de « Voir la réponse » ni d'indice, un seul geste par manche pour
  enchaîner vite. Pas de « Répondre en montrant » : l'enfant répond avec son corps.
- Fait bouger : écarté au Coucher et en Voiture. Une carte est un piège ou non d'après son thème
  (`piege` ou `jacques-a-dit`, `src/games/jacques/consigne.ts`), aussi dans le Grand Jeu et le
  Défi du jour.

### Ça rime avec… et Les contraires (#59)

- Deux jeux de langage du catalogue, tout à l'oral : le parent lit « Trouve un mot qui rime
  avec « chat » » ou « Le contraire de « grand » ? », l'enfant répond. Proposés en Voiture et
  au Coucher.
- 40 cartes chacun (`src/content/catalogue-rime.json`, `catalogue-contraire.json`), sur les
  trois niveaux. Chaque réponse liste plusieurs réponses acceptées, séparées par des virgules
  (« Rat, plat, chocolat, pyjama » ; « Petit, minuscule, tout petit ») ; un même mot n'est
  accepté que sur une carte.
- Le bloc parent montre d'emblée un exemple à souffler (« Un petit animal qui aime le
  fromage. »), puis la première lettre ; « Voir la réponse » montre la liste. Pour les rimes,
  la liste n'est qu'un exemple : tout mot qui rime compte, le parent juge.
- En montrant : l'emoji de la première réponse (🐀 Rat…) parmi les réponses d'autres cartes.

### Tape les syllabes (#127)

- Jeu du catalogue, rangé dans « Lire et compter » : découper un mot en syllabes prépare à la
  lecture. Le parent lit le mot (« Chocolat »), l'enfant tape une fois dans ses mains par
  syllabe ; le parent valide avec **Trouvé** / **Pas encore**.
- 80 mots de 1 à 4 syllabes (`src/content/catalogue-syllabes.json`) : **Petits** des mots de 1
  ou 2 syllabes (chat, lapin), **Moyens** de 1 à 3 (fraise, girafe, chocolat), **Grands** de 2
  à 4 (guitare, crocodile, hippopotame). Plus 8 cartes « Trouve un mot qui a 3 syllabes » pour
  les grands, avec trois exemples ; tout mot juste compte, le parent juge.
- **Découpage oral**, pas orthographique : on compte comme on parle, le « e » de la fin qui ne
  se dit pas ne fait pas de syllabe (« pomme » = 1, « gi-rafe » = 2) ; un rappel est montré au
  parent sur ces mots. Les lettres sont rangées dans les syllabes sans en perdre une, les
  consonnes doubles coupées au milieu (« bal-lon ») : les tests le vérifient. Mots choisis pour
  éviter les découpages qui varient selon les gens (lion, camion, cheval, arbre).
- « Pour le parent », d'emblée : le mot découpé, le nombre de syllabes et autant de 👏 ; pas de
  « Voir la réponse » ni d'indice « Ça commence par… ». « Pas tout à fait ? On le redit ensemble
  et on continue ! »
- **Voiture** : sans taper, l'enfant compte à voix haute (« cho » 1, « co » 2, « lat » 3).
  Proposé aussi au Coucher (taper dans ses mains ne fait pas courir).
- En montrant : les nombres de syllabes en grand, dans l'ordre (2, 3 ou 4 choix selon le
  niveau) ; pas de choix pour « Trouve un mot… ». Une carte est jouée ainsi d'après son thème
  (`syllabes`, et `trouve` pour la variante, `src/games/syllabes/syllabes.ts`), aussi dans le
  Grand Jeu et le Défi du jour.

### Ombres (#61)

- Jeu du catalogue : l'image apparaît **en silhouette**, l'enfant devine qui se cache ; « Voir la
  réponse » la montre **en couleur**, en fondu (0,8 s). Avec « réduire les animations », elle
  passe en couleur d'un coup.
- Silhouette noire en thème jour, claire en thème nuit : toujours contrastée avec le fond de la
  carte. Simple filtre CSS sur l'emoji, aucun fichier.
- 36 emoji (`src/content/catalogue-ombre.json`), 12 par niveau, retenus pour leur forme
  reconnaissable de profil (trompe, long cou, pinces, ailes…) : pas de visage rond ni de fruit
  en boule. Chaque carte donne au parent un indice sur la forme. Liste à relire par un humain.
- En montrant : la silhouette reste, les choix en couleur s'ajoutent dessous (retrouver l'image
  de l'ombre). Convient au Coucher, pas en Voiture (il faut regarder l'écran).
- **Jeux créés** de type Image : « Montrer les images » **Telles quelles** (par défaut) ou
  **En ombres**, dans la page du jeu. Un emoji y devient une silhouette ; une photo, faute de
  détourage, est assombrie et floutée, puis montrée nette avec la réponse. Le choix est gardé
  dans le fichier de jeu partagé et la sauvegarde (champ facultatif `shadow`).
- Dans le Grand Jeu et le Défi du jour, la carte se joue aussi en ombre.

### L’intrus (#63)

- Jeu du catalogue, rangé dans « Lire et compter » (classer, raisonner) : « Laquelle ne va pas
  avec les autres ? ». Une grille de deux sur deux, quatre emoji ; **la place de l'intrus est
  tirée au hasard** à chaque manche, les trois autres images mélangées.
- 40 cartes (`src/content/catalogue-intrus.json`) : Petits (14), des catégories évidentes
  (trois fruits et une voiture) ; Moyens (13), une couleur, un lieu de vie, un usage ; Grands
  (13), des règles plus fines (le manchot ne vole pas, l'araignée a huit pattes, « ch » de chat).
  Champ `others` : les trois images qui vont ensemble ; `emoji` : l'intrus ; `text` : la règle.
- **Toucher une image ne valide rien** : elle est entourée, sans dire si c'est la bonne
  (« Pourquoi celle-là ? C'est le parent qui valide »). Le parent garde la main avec
  **Trouvé** / **Pas encore**. Derrière « Voir la réponse » : l'intrus, sa place (« en bas à
  droite ») et la règle cachée (« Ce n'est pas un fruit »). Une autre bonne raison donnée par
  l'enfant compte aussi. « Un indice » donne un coup de pouce sans la règle.
- Se regarde : proposé au Coucher, pas en Voiture. La grille est toujours là, avec ou sans
  « Répondre en montrant ». Se joue aussi dans le Grand Jeu et le Défi du jour.
- Images : emoji dessinés par la police du téléphone, aucun fichier, aucun droit tiers.

### Qu’est-ce qui a disparu ? (#64)

- Jeu du catalogue de mémoire visuelle, rangé dans « Lire et compter ». Trois étapes, chacune
  lancée par le parent, **sans aucun minuteur** : l'enfant regarde les objets aussi longtemps
  qu'il veut (« Regarde bien tous les objets ! »), le parent touche **Cacher les objets**
  (cartes retournées, « Ferme les yeux ! »), puis **Remontrer les objets** : « Qu'est-ce qui a
  disparu ? ». **Trouvé** / **Pas encore** à tout moment, comme ailleurs.
- **Variante « Qu'est-ce qui est arrivé ? »** : en haut de la partie, « Un objet disparaît »
  (par défaut) ou « Un objet arrive », gardé pour la partie. Changer de variante recommence
  l'observation de la manche. Le Grand Jeu et le Défi du jour jouent « Un objet disparaît ».
- **Selon le niveau de la carte** : Petits, 3 objets qui **restent à leur place** (deux sur deux,
  la case de l'objet parti reste vide, pointillée) ; Moyens, 5 objets, toujours à leur place
  (trois sur deux) ; Grands, 6 objets qui **changent de place** en revenant, sans case vide.
  L'écran le dit pendant l'observation. Pour l'objet qui arrive : il prend la case libre
  (petits, moyens) ou se glisse parmi les objets mélangés (grands).
- 36 objets (`src/content/catalogue-disparu.json`), 12 par niveau, des plus familiers (chat,
  pomme, ballon) aux moins courants (boussole, ancre, sablier). Une carte est l'objet qui
  disparaît (ou arrive) ; les autres objets de la scène sont tirés parmi les autres cartes, du
  même niveau d'abord, sans doublon. Aucun nouveau champ de pack.
- **Bloc parent** : ce qu'il faut faire à chaque étape et, derrière « Voir la réponse »,
  l'objet et sa place (« en haut à gauche »), plus « Les autres objets ont bougé » chez les
  grands. « Un indice » décrit l'objet (« Il fait miaou »).
- En montrant : quand un objet a disparu, l'enfant le retrouve parmi les objets restés là
  (2, 3 ou 4 choix selon le niveau) ; quand un objet arrive, il le montre sur la scène.
- Se regarde : proposé au Coucher, pas en Voiture. Pas d'Image cachée. Les objets apparaissent
  en douceur, sans animation avec « réduire les animations ».

### Compte avec moi (#65)

- Jeu du catalogue, rangé dans « Lire et compter » : les chiffres ne sont plus seulement des
  symboles, l'enfant **dénombre**. Le parent lit la question, l'enfant compte du doigt et
  répond ; le parent valide avec **Trouvé** / **Pas encore**.
- **Cartes générées** : le pack (`src/content/catalogue-compte.json`) ne contient que des
  objets (emoji et nom au pluriel, « Les pommes »), 13 par niveau. Chaque manche tire au hasard
  le type de question, les nombres et la place des objets : jamais deux parties identiques
  (`src/games/compte/compte.ts`, fonctions pures).
- Selon le niveau de l'objet tiré (donc celui de la partie, ou de l'enfant en « Chacun son
  tour ») : **Petits** compter jusqu'à 5 et comparer deux groupes de 5 au plus (deux d'écart au
  moins) ; **Moyens** compter jusqu'à 10, comparer jusqu'à 10 ; **Grands** compter jusqu'à 20,
  additions « 3 pommes et 2 pommes, ça fait combien ? » (deux groupes, 20 au plus), soustractions
  (« Il y a 8 pommes, on en enlève 3 » : les objets enlevés restent visibles, pâlis et barrés) et
  comparaisons. Comparer : « Où y en a-t-il le plus ? », deux objets différents, l'un sous l'autre.
- **Disposition** : jusqu'à 6 objets, une fois sur deux en constellation (faces d'un dé), sinon
  au hasard dans une grille invisible (4 × 3, 5 × 3 ou 6 × 5 cases), un objet par case, un peu
  décalé. L'emoji est plus petit que sa case et le décalage borné : deux objets ne se
  chevauchent jamais (vérifié par les tests). Le champ prend la largeur de l'écran en gardant
  ses proportions : au plus 6 cases de large, l'emoji fait près de 30 px sur un écran de 320 px.
- « Pour le parent » : la réponse en clair (« 3 + 2 = 5 pommes. ») derrière « Voir la
  réponse », et un indice (« Touchez chaque pomme du doigt en comptant à voix haute. »).
- **En montrant** : des nombres proches de la réponse, rangés dans l'ordre (2, 3 ou 4 choix
  selon le niveau) ; pour comparer, les deux groupes (emoji et nom). Un mauvais choix ne fait rien.
- Se regarde : proposé au Coucher, pas en Voiture. Se joue aussi dans le Grand Jeu et le Défi du
  jour (sans choix ; la même manche toute la journée, tirée d'après la date). Pas d'Image cachée.
- Après un rafraîchissement, les objets tirés sont gardés, mais la manche en cours est
  regénérée (autres nombres), comme la grille de L'intrus.
- Images : emoji dessinés par la police du téléphone, aucun fichier, aucun droit tiers.

### Devine-tête (#67)

- Jeu du catalogue où les rôles s'inversent : l'enfant tient le téléphone **sur son front**,
  l'écran tourné vers les autres, et ne voit pas le mot ; les autres le miment ou le décrivent
  sans le dire. Le mot s'affiche en grand avec son emoji et une idée pour le faire deviner.
- 45 mots (`src/content/catalogue-devine-tete.json`), 15 par niveau : animaux et objets du
  quotidien pour les petits, métiers et objets pour les moyens, personnages et lieux pour les
  grands.
- Avant la première manche, la règle, puis le choix : **Jouer en penchant la tête** ou **Jouer
  avec les boutons**. L'inclinaison est expliquée d'abord (lue sur le téléphone seulement, rien
  d'enregistré ni d'envoyé) ; l'autorisation n'est demandée qu'à l'appui sur ce bouton, et
  seulement par les téléphones qui en demandent une (iPhone). Refusée ou absente (ordinateur),
  on joue avec les boutons.
- Tête **vers le bas : trouvé** (une étoile), **vers le haut : passer**. Un geste ne compte
  qu'une fois : il faut revenir debout (0,4 s) avant le suivant, et au départ aussi (le
  téléphone tendu à plat ne valide rien). Les boutons **Trouvé** / **Passer** restent toujours
  là pour le parent. Calcul pur dans `src/games/tete/tilt.ts`.
- L'enfant ne voit pas l'écran : **un son distinct pour chaque réponse**, même à la dernière
  manche : l'arpège de l'étoile (ou de la récompense) pour trouvé, deux notes égales
  « toc-toc » pour passer. Pas de félicitation parlée en cours de partie (elle couvrirait les
  autres), seulement à la fin. Sons coupés dans l'espace Parent : l'écran de règle le signale.
- L'écran passe en paysage quand le navigateur l'accepte (appli installée) ; sinon le mot est
  tourné d'un quart de tour, du côté où le téléphone est tenu (capteur), et « Retourner le
  mot » le met à l'endroit pour l'autre côté.
- On mime : pas au Coucher, et pas en Voiture (il faut regarder l'écran). Ni dans le Grand Jeu
  ni dans le Défi du jour, qui ne prévoient pas de passer le téléphone sur le front. Chacun son
  tour et en équipes comme les autres jeux (« À toi, Léa ! » : celle qui a le téléphone).

### Où ça va ? (#130)

- Jeu du catalogue, rangé dans « Parler » : la carte montre un élément en grand (emoji et mot)
  et deux ou trois familles ; le parent lit la question (« La vache, ça vit à la ferme, dans la
  forêt ou dans la mer ? »), l'enfant dit où il va **et pourquoi**, le parent valide avec
  **Trouvé** / **Pas encore**.
- 80 cartes (`src/content/catalogue-tri.json`) sur 6 thèmes : animaux (ferme, forêt, mer),
  aliments (fruit, légume), vêtements (été, hiver), objets de la maison (cuisine, salle de
  bain), chaud ou froid, transports (route, ciel, eau). Petits 37, Moyens 28, Grands 15.
  Thèmes et familles dans `src/games/tri/tri.ts`.
- Derrière « Voir la réponse » : la famille et une phrase d'explication. **Les cas discutables
  ne sont pas tranchés** (le canard vit à la ferme et sur l'étang, la tomate est un fruit qu'on
  cuisine comme un légume) : « Carte discutable : plusieurs réponses vont » est dit d'emblée au
  parent, et la réponse donne chacune des familles (« les deux se disent »). Une autre bonne
  raison de l'enfant compte aussi.
- « Répondre en montrant » : les familles du thème deviennent les choix (toujours toutes,
  deux ou trois, quel que soit l'âge) ; sur une carte discutable, chacune est acceptée. Sans
  ce réglage, les familles restent montrées, sans rien à toucher.
- Se joue à l'oral (la question nomme les familles) : au Coucher et en Voiture, où rien n'est
  à toucher. Se joue aussi dans le Grand Jeu et le Défi du jour.
- Images : emoji dessinés par la police du téléphone, aucun fichier, aucun droit tiers.

### Devine avec tes mains (#134)

- Jeu du catalogue où l'appli ne fait que guider : le jeu se passe avec de **vrais objets**
  glissés dans un sac ou une chaussette. Reconnaître au toucher, trouver les mots pour décrire.
- Au lancement, à chaque partie : un **rappel de sécurité** (« Avant 4 ans, rien de plus petit
  que 4 cm », rien qui coupe ou qui pique, rien de chaud, pas de pile), puis **qui devine**
  (l'enfant, ou le parent pendant que l'enfant prépare le sac en cachette), puis la **liste des
  objets** à rassembler, que « Une autre liste » remplace.
- Une liste = autant d'objets que de manches, 6 au plus (3 en Express), tirés au niveau de la
  partie ou de chaque enfant en « Chacun son tour ». 27 objets
  (`src/content/catalogue-devine-mains.json`), au moins 6 par niveau : des objets très
  différents pour les petits (peluche, balle de tennis, cuillère en bois), des formes plus
  proches pour les grands (citron, pomme de terre, kiwi). **Toutes les listes respectent le
  rappel, pour tous les âges** (relues une à une, et un test refuse les pièges connus : billes,
  pièces, piles, ciseaux…).
- Chaque manche, trois consignes courtes, lisibles d'un coup d'œil : « Touche sans regarder. »,
  « Dis comment c'est. », « Devine ! ». « Pour le parent » : deux questions pour aider à décrire
  (« C'est doux ou ça gratte ? »), différentes à chaque manche. On sort l'objet ensemble pour
  vérifier ; le parent valide avec **Trouvé** / **Pas encore**.
- Se joue à l'oral : au Coucher et en Voiture aussi. Ni dans le Grand Jeu ni dans le Défi du
  jour, qui ne prévoient pas de sac préparé. Images : emoji, aucun fichier, aucun droit tiers.

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
- Cartes (50 maximum) : réponse et indice facultatif, plus selon le type :
  - Son : un **enregistrement** au micro (10 s maximum), que le parent fait écouter à chaque
    manche (« Écouter le son »), ou un bruit à imiter par le parent ;
  - Image : une **photo** de l'appareil (réduite à 1280 px) ou un texte à montrer ; le jeu
    peut se jouer « En ombres » (voir « Ombres ») ;
    « Ajouter une photo » ouvre le choix d'Android (galerie ou appareil photo). La photo est
    réduite à 1280 px et recopiée en JPEG dans la base (jamais le fichier d'origine, qui peut
    devenir illisible). Une même photo peut être reprise. Si elle ne peut pas être lue (format
    inconnu, HEIC…), est trop lourde (plus de 5 Mo sans réduction possible) ou si le téléphone
    est plein, un message le dit ; « Ajouter la carte » attend la fin de la préparation.
  - Question : le texte de la question ;
  - Mot à dessiner : le mot, joué comme « Dessine ça ».
- Jeu Image : option **Image cachée** (#62), l'image se dévoile par paliers.
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
- Données gardées : jeu, date, manches jouées, étoiles, joueurs actifs au lancement (sur l'appareil uniquement).

## Sons d'interface

- Petits sons **synthétisés** dans l'appli (Web Audio), comme les mélodies : aucun fichier audio,
  donc aucun droit à gérer, et ils marchent hors ligne.
- **Trouvé** : un petit arpège montant ; **Passer / Pas encore** : une seule note douce, jamais un
  son d'échec ; **fin du minuteur** de Dessine ça : deux tintements ; **fin de partie** : un arpège
  complet ; **récompense débloquée** (1, 10, 25… étoiles) : un arpège plus long ; **passer en
  Devine-tête** : deux notes égales, plus audibles que la note de « Passer ».
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
- Chacun son tour : chaque carte est tirée au niveau de l'enfant dont c'est le tour (repli sur le
  niveau voisin comme ci-dessus) ; un enfant sans niveau suit le niveau de la partie.
- Interface en **français uniquement** pour la v1.

## Espace Parent (proposition)

- Joueurs, jeux, thème (auto / jour / nuit), **manches par partie** (5, 10 ou 15),
  **minuteur de Dessine ça** (30 s, 1 min, 1 min 30), **jeux du Grand Jeu**, **Image cachée**, **sons** (activés / désactivés), **volume de l'appli** (doux / normal), **félicitations parlées**, **défi du jour**, **vibrations**, remise à zéro des étoiles,
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
2. **Quelle chanson ?** — manche _n_ sur 10, compteur d'étoiles, lecteur d'extrait (10 s),
   bloc parent avec titre caché + indice, bouton « Voir la réponse ».
3. **Quelle lettre, quel chiffre ?** — bascule Lettres / Chiffres, glyphe en grand
   (« Montre l'écran à l'enfant »), consigne parent, boutons Passer / Trouvé.
4. **Dessine ça** — minuteur, mot lu par le parent, zone de dessin au doigt,
   boutons Passer / C'est fini.
5. **Ajouter un jeu** — catalogue (Quel animal ?, Quelle couleur ?, Mime ça, Devinettes,
   Quelle émotion ?, Mime l’émotion, Chasse au trésor, Vrai ou faux rigolo, Jacques a dit,
   Ça rime avec…, Les contraires, Ombres, L’intrus, Qu’est-ce qui a disparu ?,
   Compte avec moi, Devine-tête, Tape les syllabes, Où ça va ?,
   Devine avec tes mains)
   groupé par type, avec filtres (type, âge, moment) et bouton Ajouter / Ajouté, et formulaire
   « Créer mon propre jeu » (nom, type : Son / Image / Mot à dessiner / Question, ce que fait
   l'enfant, âge facultatif, puis ajout des questions).

## Principes produit

- Hors ligne d'abord : tout fonctionne sans réseau une fois l'appli installée.
- Aucune donnée ne quitte l'appareil (pas de compte, pas d'analytics, pas de pub).
- Thème jour / nuit, gros boutons (≥ 48 px), contrastes AA.
