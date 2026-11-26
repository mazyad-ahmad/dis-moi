import type { ReactNode } from 'react';
import { href } from '../app/router';
import { useSeance } from '../data/seance';
import { starsLabel } from '../games/format';
import { IconClose, IconStar } from './icons';

interface Props {
  round?: number;
  rounds?: number;
  stars?: number;
  category: string;
  title: string;
  /** Élément affiché à droite du titre (ex. minuteur). */
  aside?: ReactNode;
}

/** En-tête commun des jeux : quitter, manche, étoiles, catégorie et titre. */
export function GameHeader({ round, rounds, stars, category, title, aside }: Props) {
  const { lastGame } = useSeance();
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
          <span className="game-header__stars" aria-label={starsLabel(stars)}>
            <IconStar size={20} /> {stars}
          </span>
        )}
      </div>
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
