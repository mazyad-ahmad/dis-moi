import { Card } from '../components/Card';
import { useSettings } from '../data/settings';
import { GRAND_NAME, MIN_GRAND_GAMES } from '../games/grand/pool';
import { toggleGrandGame, useGrandPool } from '../games/grand/useGrand';
import { TileIcon } from './Home';
import '../games/grand/grand.css';

/** Jeux mélangés dans le Grand Jeu (#41) : choix mémorisé, au moins deux jeux. */
export function GrandSection() {
  const pool = useGrandPool();
  const { grandExcluded } = useSettings();
  if (!pool) return null;
  const kept = pool.all.filter((g) => !grandExcluded.includes(g.id)).length;
  return (
    <section className="setting" aria-labelledby="grand-title">
      <h2 id="grand-title" className="eyebrow">
        {GRAND_NAME}
      </h2>
      <p className="muted">
        Les jeux mélangés, un différent à chaque manche. Au moins {MIN_GRAND_GAMES}.
      </p>
      <ul className="catalogue__list">
        {pool.all.map((g) => {
          const on = !grandExcluded.includes(g.id);
          return (
            <li key={g.id}>
              <Card className="catalogue-row">
                <span className={`grand-row__icon tint--${g.tint}`} aria-hidden="true">
                  <TileIcon game={g} />
                </span>
                <span className="catalogue-row__text">
                  <strong>{g.name}</strong>
                  <span className="muted">{g.category}</span>
                </span>
                <button
                  type="button"
                  className={`pill${on ? ' pill--on' : ''}`}
                  aria-pressed={on}
                  aria-label={`${g.name} dans ${GRAND_NAME}`}
                  disabled={on && kept <= MIN_GRAND_GAMES}
                  onClick={() => void toggleGrandGame(g.id)}
                >
                  {on ? 'Inclus' : 'Inclure'}
                </button>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
