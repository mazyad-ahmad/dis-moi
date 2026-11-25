import { href } from '../app/router';
import { ScreenHeader } from '../components/ScreenHeader';

export function NotFound() {
  return (
    <main className="screen">
      <ScreenHeader title="Page introuvable" back="/" />
      <a href={href('/')}>Retour à l'accueil</a>
    </main>
  );
}
