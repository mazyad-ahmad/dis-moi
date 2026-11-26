import { href } from '../app/router';
import { Card } from '../components/Card';
import { IconStar } from '../components/icons';
import { useRecords } from '../data/history';
import { useSettings } from '../data/settings';
import { DAILY_ID, DAILY_NAME, dailyDone, useToday } from '../games/defi/daily';

/**
 * Défi du jour sur l'accueil (#43) : une invitation, jamais un reproche.
 * Rien ne rappelle les jours sans défi ; le parent peut le masquer dans son espace.
 */
export function DailyCard() {
  const { dailyChallenge } = useSettings();
  const day = useToday();
  const records = useRecords();
  if (!dailyChallenge || records === undefined) return null;
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
