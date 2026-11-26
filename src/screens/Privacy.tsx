import { href } from '../app/router';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';

/** Page « Confidentialité » : ce que l'appli garde, où, et comment l'effacer. */
export function Privacy() {
  return (
    <main className="screen prose">
      <ScreenHeader title="Confidentialité" back="/parent" />

      <p className="lead">Dis-moi ne collecte aucune donnée. Rien ne quitte ce téléphone.</p>

      <Card>
        <h2 className="h3">Ce qui est gardé sur le téléphone</h2>
        <ul>
          <li>
            les prénoms des joueurs (et leur niveau : petits, moyens ou grands, s’il est choisi) ;
          </li>
          <li>
            en équipes, les noms des équipes et les prénoms des invités, jusqu’à ce que le parent
            arrête les équipes (ils ne vont pas dans la sauvegarde) ;
          </li>
          <li>les parties jouées et les étoiles gagnées ;</li>
          <li>les jeux créés, avec leurs photos et les sons enregistrés ;</li>
          <li>les félicitations enregistrées par le parent ;</li>
          <li>les réglages de l'espace Parent.</li>
        </ul>
        <p>
          Ces données sont rangées dans le stockage du navigateur, sur cet appareil uniquement.
          Elles ne sont ni envoyées, ni partagées, ni sauvegardées ailleurs sans le geste du parent
          (voir « Sauvegarde » plus bas). L’appli demande au navigateur de protéger ce stockage pour
          qu’il ne l’efface pas quand le téléphone manque de place.
        </p>
      </Card>

      <Card>
        <h2 className="h3">Ce que l'appli ne fait pas</h2>
        <ul>
          <li>pas de compte ni d'inscription ;</li>
          <li>pas de publicité ;</li>
          <li>pas de statistiques d'usage ni de suivi ;</li>
          <li>pas d'achat dans l'appli ;</li>
          <li>aucune connexion à un serveur tiers : l'appli marche hors ligne.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="h3">Micro, photos et voix</h2>
        <p>
          Les photos ne servent qu'à « Créer mon propre jeu », quand le parent ajoute une image à
          une carte. Le micro sert à deux choses : enregistrer le son d'une carte, et enregistrer
          les félicitations du parent (« Bravo ! »), dans l'espace Parent. Android demande alors
          l'autorisation ; on peut la refuser et jouer sans enregistrement.
        </p>
        <p>
          Les félicitations enregistrées restent sur ce téléphone : elles ne sont jamais envoyées,
          ni mises dans la sauvegarde ou dans un jeu partagé. « Effacer toutes les données » les
          supprime.
        </p>
        <p>
          Le bouton « Lire » utilise seulement une voix française installée sur le téléphone : le
          texte lu n’est envoyé nulle part. Sans voix installée, le bouton n’apparaît pas. Les
          félicitations parlées (« Bravo ! ») utilisent la même voix, ou celles du parent.
        </p>
      </Card>

      <Card>
        <h2 className="h3">Partager un jeu créé</h2>
        <p>
          « Partager le jeu (fichier) » crée un fichier avec les cartes, les photos et les sons du
          jeu. Il ne part que si le parent choisit où l'envoyer (message, e-mail…). Un fichier
          importé reste lui aussi sur ce téléphone.
        </p>
      </Card>

      <Card>
        <h2 className="h3">Sauvegarde</h2>
        <p>
          « Sauvegarder tout », dans l’espace Parent, crée un fichier avec les prénoms des joueurs,
          les parties et les étoiles, les réglages et les jeux créés (photos et sons compris). Comme
          pour un jeu partagé, il ne part que si le parent choisit où le mettre (Drive, e-mail,
          téléchargements…) ; il n’est pas chiffré, il faut donc le garder dans un endroit sûr. «
          Restaurer une sauvegarde » relit ce fichier sur le téléphone, sans rien envoyer.
        </p>
      </Card>

      <Card>
        <h2 className="h3">Tout effacer</h2>
        <p>
          Dans l'<a href={href('/parent')}>espace Parent</a>, « Effacer toutes les données »
          supprime tout. Désinstaller l'appli, ou effacer les données du site dans Chrome, le fait
          aussi.
        </p>
      </Card>
    </main>
  );
}
