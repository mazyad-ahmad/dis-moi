# Tests sur appareil

Ces vérifications demandent un vrai téléphone : le mobile simulé des tests e2e ne les couvre pas (#24).
Les tests se font dans Chrome sur Android, avec l'appli installée depuis https://mazyad-ahmad.github.io/dis-moi/.

À chaque campagne : ajouter une colonne par appareil (modèle, version d'Android), noter ✅, ❌ ou — (pas testé), et ouvrir une issue par défaut trouvé.
L'objectif est d'avoir au moins deux appareils, un récent et un modeste.

## Grille

| #   | Cas                | Comment faire                                                                             | Résultat attendu                                                                    |
| --- | ------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | Installation       | Ouvrir l'adresse publique, puis Espace Parent → « Installer l'appli »                     | Icône sur l'écran d'accueil, l'appli s'ouvre en plein écran                         |
| 2   | Hors ligne         | Appli installée, mode avion, lancer plusieurs jeux                                        | Tout fonctionne : jeux, sons, polices, étoiles                                      |
| 3   | Mise à jour        | Après une fusion dans `main`, rouvrir l'appli installée                                   | Le bandeau « Mettre à jour » s'affiche ; après l'appui, c'est la nouvelle version   |
| 4   | TalkBack           | Activer TalkBack, faire une partie complète                                               | Chaque bouton est annoncé clairement, la partie se joue sans voir l'écran           |
| 5   | Mélodies           | « Quelle chanson ? »                                                                      | Volume correct, pas de latence au lancement, pas de grésillement, arrêt en quittant |
| 6   | Micro              | « Créer mon propre jeu » de type son : enregistrer, puis jouer le jeu                     | Autorisation demandée, enregistrement relu, son joué pendant la partie              |
| 7   | Photo              | Jeu créé de type photo : ajouter une carte avec une photo                                 | Le sélecteur (appareil photo ou galerie) s'ouvre, la photo s'affiche dans la carte  |
| 8   | Partage de fichier | Exporter ou partager un jeu, puis le réimporter                                           | Le partage Android s'ouvre, le jeu revient intact                                   |
| 9   | Dessin au doigt    | « Dessine ça »                                                                            | Le trait suit le doigt sans retard, la page ne défile pas                           |
| 10  | Écran allumé       | Laisser une manche ouverte plus longtemps que la mise en veille du téléphone              | L'écran reste allumé pendant la partie et s'éteint normalement en dehors            |
| 11  | Remise à zéro      | Espace Parent → « Remettre les étoiles à zéro », ouvrir Étoiles, rejouer, rouvrir Étoiles | « Pas encore d'étoiles », puis les nouvelles étoiles s'affichent                    |
| 12  | Pages longues      | Faire défiler l'Espace Parent (et les autres pages longues) jusqu'en bas                  | Le défilement s'arrête à la fin du contenu, la barre du bas reste fixée en bas      |

## Résultats

### Campagne du 26 novembre 2026

Appareil : Poco F6, HyperOS 3, Chrome, appli installée.

| #   | Cas                | Résultat | Remarque                                                                                                                                                                                                                                                        |
| --- | ------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Installation       | ✅       |                                                                                                                                                                                                                                                                 |
| 2   | Hors ligne         | ✅       |                                                                                                                                                                                                                                                                 |
| 3   | Mise à jour        | —        | À faire à la prochaine fusion dans `main`                                                                                                                                                                                                                       |
| 4   | TalkBack           | ⚠️       | L'écran est bien décrit, mais les boutons n'ont pas pu être activés pour passer à la suite. Probablement la prise en main de TalkBack (les boutons sont standards) : à refaire en sélectionnant le bouton d'une touche, puis en touchant deux fois n'importe où |
| 5   | Mélodies           | ✅       |                                                                                                                                                                                                                                                                 |
| 6   | Micro              | ❌       | Autorisation, enregistrement et création OK, mais aucun son pendant la partie : #141                                                                                                                                                                            |
| 7   | Photo              | ❌       | « Ajouter des questions » ne fait rien dans un jeu photo : #142                                                                                                                                                                                                 |
| 8   | Partage de fichier | —        |                                                                                                                                                                                                                                                                 |
| 9   | Dessin au doigt    | ✅       |                                                                                                                                                                                                                                                                 |
| 10  | Écran allumé       | ✅       |                                                                                                                                                                                                                                                                 |
| 11  | Remise à zéro      | ❌       | Page Étoiles vide après la remise à zéro, même après de nouvelles parties : #143                                                                                                                                                                                |
| 12  | Pages longues      | ❌       | Espace Parent : on défile au-delà du contenu, la barre du bas remonte : #145                                                                                                                                                                                    |
