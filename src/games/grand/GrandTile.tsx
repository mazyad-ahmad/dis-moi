import { href } from '../../app/router';
import { IconGrid } from '../../components/icons';
import { GRAND_ID, GRAND_NAME, MIN_GRAND_GAMES } from './pool';
import { useGrandPool } from './useGrand';
import './grand.css';

/** Tuile de l'accueil : une partie qui mélange les jeux (#41). */
export function GrandTile() {
  const pool = useGrandPool();
  // Moins de deux jeux pour la façon de jouer choisie (#42) : rien à mélanger.
  if (pool && pool.included.length < MIN_GRAND_GAMES) return null;
  return (
    <a href={href(`/jeu/${GRAND_ID}`)} className="game-tile game-tile--grand">
      <span className="game-tile__icon">
        <IconGrid size={26} />
      </span>
      <span>
        <span className="game-tile__name">{GRAND_NAME}</span>
        <span className="game-tile__category">Un jeu différent à chaque manche</span>
      </span>
    </a>
  );
}
