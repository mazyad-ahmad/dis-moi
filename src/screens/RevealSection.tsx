import { Card } from '../components/Card';
import { customRouteId, setCustomReveal, useCustomGames } from '../data/customGames';
import { useSettings } from '../data/settings';
import { CATALOGUE } from '../games/catalogue/catalogue';
import {
  REVEAL_NAME,
  revealOn,
  revealsInCatalogue,
  toggleCatalogueReveal,
} from '../games/reveal/reveal';

const REVEAL_CATALOGUE = CATALOGUE.filter(revealsInCatalogue);

/** Image cachée (#62) : les jeux Image, catalogue ou créés, où l'image se dévoile par paliers. */
export function RevealSection() {
  const { revealCatalogue } = useSettings();
  const custom = useCustomGames();
  // Un jeu joué en ombres (#61) n'est pas proposé : l'ombre l'emporte sur l'Image cachée.
  const created = (custom ?? []).filter((g) => g.kind === 'image' && !g.shadow);
  const rows = [
    ...REVEAL_CATALOGUE.map((g) => ({
      key: g.id,
      name: g.name,
      on: revealCatalogue.includes(g.id),
      toggle: () => toggleCatalogueReveal(g.id),
    })),
    ...created.map((g) => ({
      key: customRouteId(g.id),
      name: g.name,
      on: revealOn(customRouteId(g.id), revealCatalogue, custom),
      toggle: () => setCustomReveal(g.id, !g.reveal),
    })),
  ];
  if (!rows.length) return null;
  return (
    <section className="setting" aria-labelledby="reveal-title">
      <h2 id="reveal-title" className="eyebrow">
        {REVEAL_NAME}
      </h2>
      <p className="muted">
        L’image démarre floue et se précise à chaque appui sur « Préciser l’image ».
      </p>
      <ul className="catalogue__list">
        {rows.map((r) => (
          <li key={r.key}>
            <Card className="catalogue-row">
              <span className="catalogue-row__text">
                <strong>{r.name}</strong>
              </span>
              <button
                type="button"
                className={`pill${r.on ? ' pill--on' : ''}`}
                aria-pressed={r.on}
                aria-label={`${REVEAL_NAME} : ${r.name}`}
                onClick={() => void r.toggle()}
              >
                {r.on ? 'Activée' : 'Activer'}
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
