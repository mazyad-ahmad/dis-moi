import { href } from '../app/router';
import { useSeance } from '../data/seance';
import { starsLabel } from '../games/format';
import { Button } from './Button';
import { Confetti } from './Confetti';
import { IconStar } from './icons';

interface Props {
  stars: number;
  rounds: number;
  onReplay: () => void;
}

/** Fin de séance (#120) : un dernier bravo, une respiration, et on range. */
function SeanceEnd({ stars }: { stars: number }) {
  return (
    <main className="screen result">
      <div className="breathe" aria-hidden="true">
        <span className="breathe__ball" />
      </div>
      <h1 className="h1">C’était la dernière partie !</h1>
      <p className="lead">
        {stars > 0 ? `${starsLabel(stars)} gagnées ensemble, bravo !` : 'Bravo d’avoir joué !'}
      </p>
      <p className="breathe__text">
        On respire comme un ballon : on gonfle doucement… et on souffle.
      </p>
      <p className="lead">On range le téléphone ?</p>
      <div className="spacer" />
      <a className="btn btn--primary btn--block" href={href('/')}>
        À plus tard
      </a>
    </main>
  );
}

/** Écran de fin de partie : étoiles gagnées ensemble, Rejouer ou Accueil. */
export function GameResult({ stars, rounds, onReplay }: Props) {
  const seance = useSeance();
  if (seance.over) return <SeanceEnd stars={stars} />;
  return (
    <main className="screen result">
      <Confetti />
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
      {seance.nextIsLast && <p className="seance-notice">Encore une partie, et après on range.</p>}
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
