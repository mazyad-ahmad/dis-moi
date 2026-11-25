import { href } from '../app/router';
import { Card } from '../components/Card';
import { IconStar } from '../components/icons';
import { useCustomGames } from '../data/customGames';
import { useRecords } from '../data/history';
import { dayLabel, starsLabel } from '../games/format';
import { gameName } from '../games/useGames';

/** Rappel de la dernière partie, en bas de l'accueil. */
export function LastGame() {
  const records = useRecords();
  const custom = useCustomGames();
  if (records === undefined) return null;
  const last = records[0];
  return (
    <Card raised className="last-game">
      <IconStar />
      {last ? (
        <span>
          Dernière partie {dayLabel(last.startedAt)} :{' '}
          <strong>{gameName(last.gameId, custom)}</strong>, {starsLabel(last.stars)}.{' '}
          <a href={href('/etoiles')}>Voir les étoiles</a>
        </span>
      ) : (
        <span>Pas encore de partie : choisis un jeu pour gagner tes premières étoiles.</span>
      )}
    </Card>
  );
}
