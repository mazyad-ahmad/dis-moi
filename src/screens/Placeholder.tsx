import { href } from '../app/router';
import { ScreenHeader } from '../components/ScreenHeader';

export function AddGamePlaceholder() {
  return (
    <main className="screen">
      <ScreenHeader title="Ajouter un jeu" back="/" />
      <p className="lead">Le catalogue et la création de jeux arrivent bientôt.</p>
    </main>
  );
}

export function NotFound() {
  return (
    <main className="screen">
      <ScreenHeader title="Page introuvable" back="/" />
      <a href={href('/')}>Retour à l'accueil</a>
    </main>
  );
}
