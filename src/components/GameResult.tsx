import { href } from '../app/router';
import { starsLabel } from '../games/format';
import { Button } from './Button';
import { IconStar } from './icons';

interface Props {
  stars: number;
  rounds: number;
  onReplay: () => void;
}

/** Écran de fin de partie : étoiles gagnées ensemble, Rejouer ou Accueil. */
export function GameResult({ stars, rounds, onReplay }: Props) {
  return (
    <main className="screen result">
      <div className="result__stars" aria-hidden="true">
        <IconStar size={96} />
      </div>
      <h1 className="h1">
        {stars > 0 ? `${starsLabel(stars)} gagnées ensemble !` : 'Bravo d’avoir joué !'}
      </h1>
      <p className="lead">
        {stars > 0
          ? `Sur ${rounds} manches. On rejoue ?`
          : 'Pas d’étoile cette fois-ci, ce sera pour la prochaine partie.'}
      </p>
      <div className="spacer" />
      <div className="answer-bar">
        <a className="btn btn--secondary" href={href('/')}>
          Accueil
        </a>
        <Button onClick={onReplay}>Rejouer</Button>
      </div>
    </main>
  );
}
