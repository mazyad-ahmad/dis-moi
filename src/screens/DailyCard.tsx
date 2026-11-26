import { href } from '../app/router';
import { Card } from '../components/Card';
import { IconStar } from '../components/icons';
import { useRecords } from '../data/history';
import { useSettings } from '../data/settings';
import { DAILY_ID, DAILY_NAME, dailyDone, dailyPick, useToday } from '../games/defi/daily';
import { suitsMode } from '../games/modes';

/**
 * Défi du jour sur l'accueil (#43) : une invitation, jamais un reproche.
 * Rien ne rappelle les jours sans défi ; le parent peut le masquer dans son espace.
 * Masqué aussi quand la carte du jour ne convient pas à la façon de jouer (#42).
 */
export function DailyCard() {
  const { dailyChallenge, gameMode } = useSettings();
  const day = useToday();
  const records = useRecords();
  if (!dailyChallenge || records === undefined) return null;
  // Carte du jour qui ne convient pas à la façon de jouer (#42) : pas proposée.
  if (!suitsMode(dailyPick(day).source.needs, gameMode)) return null;
  const done = dailyDone(records, day);
  return (
    <Card className="daily-card">
      <span className="daily-card__icon" aria-hidden="true">
        <IconStar size={22} />
      </span>
      <span className="daily-card__text">
        <span className="eyebrow">{DAILY_NAME}</span>
        {done ? (
          <span>Réussi ! À demain pour une nouvelle surprise.</span>
        ) : (
          <span>Une carte surprise, une étoile bonus.</span>
        )}
      </span>
      {!done && <a href={href(`/jeu/${DAILY_ID}`)}>Jouer</a>}
    </Card>
  );
}
