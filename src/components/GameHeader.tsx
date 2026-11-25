import { href } from '../app/router';
import { IconClose, IconStar } from './icons';

interface Props {
  round?: number;
  rounds?: number;
  stars?: number;
  category: string;
  title: string;
}

/** En-tête commun des jeux : quitter, manche, étoiles, catégorie et titre. */
export function GameHeader({ round, rounds, stars, category, title }: Props) {
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
          <span className="game-header__stars" aria-label={`${stars} étoiles`}>
            <IconStar size={20} /> {stars}
          </span>
        )}
      </div>
      <span className="eyebrow">{category}</span>
      <h1 className="game-header__title">{title}</h1>
    </header>
  );
}
