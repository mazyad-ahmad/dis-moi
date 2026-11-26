import { href } from '../app/router';
import { IconStar } from '../components/icons';
import { useRecords } from '../data/history';
import { useSettings } from '../data/settings';
import { DAILY_ID, DAILY_NAME, dailyDone, dailyPick, useToday } from '../games/defi/daily';
import { suitsMode } from '../games/modes';

/**
 * Défi du jour (#43), une tuile parmi les jeux : une invitation, jamais un reproche.
 * Rien ne rappelle les jours sans défi ; le parent peut le masquer dans son espace.
 * Masqué aussi quand la carte du jour ne convient pas à la façon de jouer (#42).
 */
export function DailyTile() {
  const { dailyChallenge, gameMode } = useSettings();
  const day = useToday();
  const records = useRecords();
  if (!dailyChallenge || records === undefined) return null;
  if (!suitsMode(dailyPick(day).source.needs, gameMode)) return null;
  const done = dailyDone(records, day);
  const content = (
    <>
      <span className="game-tile__icon">
        <IconStar size={26} />
      </span>
      <span>
        <span className="game-tile__name">{DAILY_NAME}</span>
        <span className="game-tile__category">
          {done ? 'Réussi ! À demain.' : 'Une étoile bonus'}
        </span>
      </span>
    </>
  );
  // Réussi : la tuile reste, sans lien, jusqu'au lendemain.
  return done ? (
    <div className="game-tile daily-tile daily-tile--done">{content}</div>
  ) : (
    <a href={href(`/jeu/${DAILY_ID}`)} className="game-tile daily-tile">
      {content}
    </a>
  );
}
