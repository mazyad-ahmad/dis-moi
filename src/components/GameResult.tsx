import { useEffect, useState, type CSSProperties } from 'react';
import { href, useRoute } from '../app/router';
import { playSound } from '../audio/sounds';
import { useRecords } from '../data/history';
import { useSeance } from '../data/seance';
import { starsLabel } from '../games/format';
import { gentleEnd } from '../games/modes';
import { usePlayableGames } from '../games/useGames';
import { useSettings } from '../data/settings';
import { Button } from './Button';
import { Confetti } from './Confetti';
import { IconStar } from './icons';
import { Mascot } from './Mascot';
import { prefersReducedMotion } from './motion';
import {
  COUNT_START_MS,
  COUNT_STEP_MS,
  nextGame,
  resultMessage,
  resultRewards,
  resultTitle,
} from './result';

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

/**
 * Les étoiles gagnées apparaissent une à une, chacune avec son petit son (#33).
 * Le son de fin de partie (ou de récompense) a déjà été joué à la dernière réponse
 * (`useRounds`) : on ne le rejoue pas ici.
 */
function useStarCount(stars: number) {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers = Array.from({ length: stars }, (_, i) =>
      setTimeout(() => void playSound('star'), COUNT_START_MS + i * COUNT_STEP_MS),
    );
    // Fin du compte (COUNT_START_MS + stars * COUNT_STEP_MS) : la phrase de fête parlée
    // (« Vous avez gagné 7 étoiles ensemble ! ») pourra se brancher ici.
    return () => timers.forEach(clearTimeout);
  }, [stars]);
}

/** Écran de fin de partie : étoiles gagnées ensemble, récompenses, Rejouer ou un autre jeu. */
export function GameResult({ stars, rounds, onReplay }: Props) {
  const seance = useSeance();
  const route = useRoute();
  const records = useRecords();
  // Mode Coucher (#42) : fin en douceur, sans confettis ni nouveau jeu proposé.
  const gentle = gentleEnd(useSettings().gameMode);
  const playable = usePlayableGames();
  const other = gentle
    ? undefined
    : nextGame(playable, route.name === 'game' ? route.id : undefined);
  const [message] = useState(() => resultMessage(stars, rounds));
  useStarCount(seance.over ? 0 : stars);
  if (seance.over) return <SeanceEnd stars={stars} />;
  const rewards = records?.length ? resultRewards(records, stars) : undefined;
  return (
    <main className="screen result">
      {!gentle && <Confetti />}
      <div className="result__stars" aria-hidden="true">
        <IconStar size={96} />
      </div>
      <Mascot mood={gentle ? 'sleep' : 'bravo'} />
      <h1 className="h1">{resultTitle(stars)}</h1>
      {stars > 0 && (
        <div className="result__count" aria-hidden="true" data-testid="result-count">
          {Array.from({ length: stars }, (_, i) => (
            <span
              key={i}
              className="result__count-star"
              style={{ '--delay': `${COUNT_START_MS + i * COUNT_STEP_MS}ms` } as CSSProperties}
            >
              <IconStar size={28} />
            </span>
          ))}
        </div>
      )}
      <p className="lead">
        {message}
        {stars > 0 && ` Sur ${rounds} manches.`}
      </p>
      {rewards?.unlocked.map((r) => (
        <p key={r.stars} className="result__reward">
          <span className="result__reward-emoji" aria-hidden="true">
            {r.emoji}
          </span>
          <span>
            Nouvelle récompense : <strong>{r.label}</strong> !
          </span>
        </p>
      ))}
      {rewards?.next && (
        <p className="muted">
          {`Encore ${starsLabel(rewards.next.missing)} pour la récompense « ${rewards.next.reward.label} ».`}
        </p>
      )}
      {gentle && <p className="lead">C’est l’heure de dormir. Bonne nuit !</p>}
      {seance.nextIsLast && <p className="seance-notice">Encore une partie, et après on range.</p>}
      <div className="spacer" />
      {other && (
        <a className="btn btn--secondary btn--block" href={href(`/jeu/${other.id}`)}>
          Un autre jeu : {other.name}
        </a>
      )}
      <div className="answer-bar">
        <a className="btn btn--secondary" href={href('/')}>
          Accueil
        </a>
        <Button onClick={onReplay}>Rejouer</Button>
      </div>
    </main>
  );
}
