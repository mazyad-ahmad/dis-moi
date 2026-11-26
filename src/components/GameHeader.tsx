import { useState, type ReactNode } from 'react';
import { href } from '../app/router';
import type { Player } from '../data/db';
import { useSeance } from '../data/seance';
import { starsLabel } from '../games/format';
import { Avatar } from './Avatar';
import { IconClose, IconStar } from './icons';

interface Props {
  round?: number;
  rounds?: number;
  stars?: number;
  category: string;
  title: string;
  /** Élément affiché à droite du titre (ex. minuteur). */
  aside?: ReactNode;
  /** Tour par tour (#38) : l'enfant dont c'est le tour, affiché en grand. */
  player?: Player;
}

/** En-tête commun des jeux : quitter, manche, étoiles, catégorie et titre. */
export function GameHeader({ round, rounds, stars, category, title, aside, player }: Props) {
  const { lastGame } = useSeance();
  // Étoiles au lancement (ou à la reprise) : le compteur ne rebondit que pour une étoile gagnée.
  const [startStars] = useState(stars);
  return (
    <header className="game-header">
      <div className="game-header__bar">
        <a className="icon-btn" href={href('/')} aria-label="Quitter la partie">
          <IconClose />
        </a>
        {round !== undefined && rounds !== undefined && (
          <span className="game-header__round">
            Manche {round} sur {rounds}
          </span>
        )}
        {stars !== undefined && (
          <span
            key={stars}
            className={`game-header__stars${stars > (startStars ?? 0) ? ' is-bumped' : ''}`}
            aria-label={starsLabel(stars)}
          >
            <IconStar size={20} /> {stars}
          </span>
        )}
      </div>
      {player && (
        <p className={`turn-banner turn-banner--${player.color}`} role="status">
          <Avatar player={player} size="lg" />
          <span className="turn-banner__text">
            À toi, <strong className="turn-banner__name">{player.name}</strong> !
          </span>
        </p>
      )}
      <div className="game-header__heading">
        <div>
          <span className="eyebrow">{category}</span>
          <h1 className="game-header__title">{title}</h1>
        </div>
        {aside}
      </div>
      {lastGame && <p className="seance-notice">Dernière partie, et après on range.</p>}
    </header>
  );
}
