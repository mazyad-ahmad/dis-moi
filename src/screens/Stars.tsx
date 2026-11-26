import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { Mascot } from '../components/Mascot';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconStar } from '../components/icons';
import { useCustomGames } from '../data/customGames';
import { REWARDS, totalStars, useRecords } from '../data/history';
import { usePlayers } from '../data/players';
import { dayLabel, starsLabel } from '../games/format';
import { modeInfo } from '../games/modes';
import { gameName } from '../games/useGames';

/** Nombre de parties affichées dans l'historique. */
const HISTORY_LENGTH = 30;

export function Stars() {
  const records = useRecords();
  const custom = useCustomGames();
  const players = usePlayers() ?? [];

  if (records === undefined) return <main className="screen" />;

  if (!records.length)
    return (
      <main className="screen">
        <ScreenHeader title="Étoiles" />
        <div className="empty">
          <Mascot mood="think" />
          <strong>Pas encore d'étoiles</strong>
          <span className="muted">Les étoiles gagnées pendant les parties s'afficheront ici.</span>
        </div>
      </main>
    );

  const total = totalStars(records);
  const next = REWARDS.find((r) => r.stars > total);
  const present = (ids: number[]) => players.filter((p) => ids.includes(p.id));

  return (
    <main className="screen">
      <ScreenHeader title="Étoiles" />

      <Card raised className="stars-total">
        <span className="stars-total__icon" aria-hidden="true">
          <IconStar size={40} />
        </span>
        <span>
          <strong className="stars-total__count">{starsLabel(total)}</strong>
          <span className="muted">
            gagnées ensemble en {records.length} {records.length > 1 ? 'parties' : 'partie'}
          </span>
        </span>
      </Card>

      <section aria-labelledby="rewards-title" className="catalogue">
        <h2 id="rewards-title" className="eyebrow">
          Récompenses
        </h2>
        <ul className="rewards">
          {REWARDS.map((r) => {
            const won = total >= r.stars;
            return (
              <li
                key={r.stars}
                className={`reward${won ? ' reward--won' : ''}`}
                aria-label={`${r.label} : ${won ? 'gagnée' : 'à gagner'}`}
              >
                <span className="reward__emoji" aria-hidden="true">
                  {won ? r.emoji : <IconStar size={28} />}
                </span>
                <span className="reward__label">{r.label}</span>
              </li>
            );
          })}
        </ul>
        {next && (
          <p className="muted">
            Encore {starsLabel(next.stars - total)} pour « {next.label} ».
          </p>
        )}
      </section>

      <section aria-labelledby="history-title" className="catalogue">
        <h2 id="history-title" className="eyebrow">
          Dernières parties
        </h2>
        <ul className="catalogue__list">
          {records.slice(0, HISTORY_LENGTH).map((r) => {
            const who = present(r.playerIds);
            return (
              <li key={r.id}>
                <Card className="history-row">
                  <span className="catalogue-row__text">
                    <strong>{gameName(r.gameId, custom)}</strong>
                    <span className="muted">
                      {dayLabel(r.startedAt)}
                      {who.length > 0 && ` · ${who.map((p) => p.name).join(', ')}`}
                      {r.mode && r.mode !== 'normal' && ` · ${modeInfo(r.mode).name}`}
                      {r.played < r.rounds && ` · ${r.played} manches sur ${r.rounds}`}
                    </span>
                    {who.length > 0 && (
                      <span className="avatar-row">
                        {who.map((p) => (
                          <Avatar key={p.id} player={p} size="sm" />
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="history-row__stars" aria-label={starsLabel(r.stars)}>
                    <IconStar size={18} /> {r.stars}
                  </span>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
