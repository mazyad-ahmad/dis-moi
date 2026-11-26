import type { Player } from '../data/db';
import { animalEmoji, avatarLabel } from '../data/players';

interface AvatarProps {
  player: Pick<Player, 'name' | 'animal' | 'color'>;
  /** sm : listes (accueil, historique) ; md : gestion des joueurs ; lg : tour par tour, choix. */
  size?: 'sm' | 'md' | 'lg';
}

/** Avatar d'un joueur : son animal sur sa couleur, nommé « Léa, renard ». */
export function Avatar({ player, size = 'md' }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={avatarLabel(player)}
      className={`avatar avatar--${size} avatar--${player.color}`}
    >
      {animalEmoji(player.animal)}
    </span>
  );
}
