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
          <li>les prénoms des joueurs ;</li>
          <li>les parties jouées et les étoiles gagnées ;</li>
          <li>les jeux créés, avec leurs photos et les sons enregistrés ;</li>
          <li>les réglages de l'espace Parent.</li>
        </ul>
        <p>
          Ces données sont rangées dans le stockage du navigateur, sur cet appareil uniquement.
          Elles ne sont ni envoyées, ni partagées, ni sauvegardées ailleurs.
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
        <h2 className="h3">Micro et photos</h2>
        <p>
          Le micro et les photos ne servent qu'à « Créer mon propre jeu », quand le parent ajoute un
          son ou une image à une carte. Android demande alors l'autorisation ; on peut la refuser et
          créer des cartes sans son ni photo.
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
