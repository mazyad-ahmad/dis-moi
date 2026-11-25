import { href } from '../app/router';
import { GameHeader } from '../components/GameHeader';
import { ParentBlock } from '../components/ParentBlock';
import { ScreenHeader } from '../components/ScreenHeader';
import { findGame } from '../games/registry';

/** Écran d'attente tant qu'un jeu n'est pas développé. */
export function GamePlaceholder({ id }: { id: string }) {
  const game = findGame(id);
  if (!game) return <NotFound />;
  return (
    <main className="screen">
      <GameHeader category={game.category} title={game.name} />
      <ParentBlock>Ce jeu arrive bientôt.</ParentBlock>
    </main>
  );
}

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
