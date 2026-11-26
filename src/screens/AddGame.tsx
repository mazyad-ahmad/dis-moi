import { useState, type FormEvent } from 'react';
import { href, navigate } from '../app/router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FilterChips } from '../components/FilterChips';
import { IconBack, IconImport } from '../components/icons';
import {
  createCustomGame,
  CustomGameError,
  MAX_GAME_NAME,
  useCustomGames,
} from '../data/customGames';
import { GAME_FILE_EXT, importGameFile } from '../data/gameFile';
import { useSettings } from '../data/settings';
import {
  ACTIVITIES,
  activitiesOf,
  activityName,
  ageLabel,
  filterGames,
  groupByActivity,
  KIND_ACTIVITY,
  MOMENTS,
  SEARCH_FROM,
  type Activity,
  type GameFilter,
} from '../games/activities';
import { CATALOGUE, type CatalogueGame } from '../games/catalogue/catalogue';
import { DECK_KINDS, kindLabel, type DeckKind } from '../games/deck/types';
import { LEVELS, type Level } from '../games/levels';
import { GAMES } from '../games/registry';
import { toggleCatalogueGame } from '../games/useGames';

function CreateForm() {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DeckKind>('question');
  // Type (#137) : celui de la façon de jouer tant que le parent n'en choisit pas un autre.
  const [chosenActivity, setActivity] = useState<Activity | null>(null);
  const activity = chosenActivity ?? KIND_ACTIVITY[kind];
  const [level, setLevel] = useState<Level | null>(null);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const id = await createCustomGame(name, kind, { activity, level });
      navigate(`/creer/${id}`);
    } catch (err) {
      setError(err instanceof CustomGameError ? err.message : 'Impossible de créer le jeu.');
    }
  }

  return (
    <form className="create-card" onSubmit={onSubmit} aria-labelledby="create-title">
      <h2 id="create-title" className="create-card__title">
        Créer mon propre jeu
      </h2>
      <label htmlFor="game-name" className="field-label">
        Nom du jeu
      </label>
      <input
        id="game-name"
        className="field"
        placeholder="Ex. : Quel est ce bruit ?"
        autoComplete="off"
        maxLength={MAX_GAME_NAME}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="chips" role="radiogroup" aria-label="Type de jeu">
        {DECK_KINDS.map((k) => (
          <label key={k.value} className="chip">
            <input
              type="radio"
              name="kind"
              value={k.value}
              checked={kind === k.value}
              onChange={() => setKind(k.value)}
            />
            {k.label}
          </label>
        ))}
      </div>
      <span className="field-label" id="create-activity">
        Ce que fait l’enfant
      </span>
      <div className="chips" role="radiogroup" aria-labelledby="create-activity">
        {ACTIVITIES.map((a) => (
          <label key={a.value} className="chip">
            <input
              type="radio"
              name="activity"
              value={a.value}
              checked={activity === a.value}
              onChange={() => setActivity(a.value)}
            />
            {a.name}
          </label>
        ))}
      </div>
      <span className="field-label" id="create-age">
        Âge (facultatif)
      </span>
      <div className="chips" role="radiogroup" aria-labelledby="create-age">
        {[{ value: null, ages: 'Tous âges' }, ...LEVELS].map((l) => (
          <label key={l.value ?? 'tous'} className="chip">
            <input
              type="radio"
              name="age"
              value={l.value ?? ''}
              checked={level === l.value}
              onChange={() => setLevel(l.value)}
            />
            {l.ages}
          </label>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" block disabled={!name.trim()}>
        Ajouter les questions
      </Button>
    </form>
  );
}

function ImportButton() {
  const [error, setError] = useState('');
  async function onFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = ''; // pour pouvoir réimporter le même fichier
    if (!file) return;
    setError('');
    try {
      navigate(`/creer/${await importGameFile(file)}`);
    } catch (err) {
      setError(err instanceof CustomGameError ? err.message : 'Impossible d’importer ce fichier.');
    }
  }
  return (
    <div className="import-game">
      <label className="btn btn--secondary btn--block">
        <IconImport size={20} />
        Importer un jeu (fichier)
        <input
          type="file"
          accept={`${GAME_FILE_EXT},.json,application/json`}
          className="sr-only"
          onChange={(e) => void onFile(e.currentTarget)}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function CatalogueRow({ game: g, on }: { game: CatalogueGame; on: boolean }) {
  return (
    <li>
      <Card className="catalogue-row">
        <span className={`catalogue-row__mark tint--${g.tint}`} aria-hidden="true">
          {g.mark}
        </span>
        <span className="catalogue-row__text">
          <strong>{g.name}</strong>
          <span className="muted">{g.desc}</span>
          <span className="muted">
            {ageLabel(g.levels)} · {g.skill}
          </span>
        </span>
        <button
          type="button"
          className={`pill${on ? ' pill--on' : ''}`}
          aria-pressed={on}
          aria-label={`${on ? 'Retirer' : 'Ajouter'} ${g.name}`}
          onClick={() => void toggleCatalogueGame(g.id)}
        >
          {on ? 'Ajouté' : 'Ajouter'}
        </button>
      </Card>
    </li>
  );
}

const AGE_OPTIONS = LEVELS.map((l) => ({ value: l.value, label: l.ages }));
const MOMENT_OPTIONS = MOMENTS.map((m) => ({ value: m.value, label: m.name }));

function countLabel(n: number): string {
  return `${n} ${n > 1 ? 'jeux' : 'jeu'}`;
}

/**
 * Catalogue (#137) : jeux groupés par type. Filtres par type, âge et moment, qui se cumulent et
 * se retirent d'un geste ; une recherche quand la liste dépasse 20 jeux. Sans filtre : tout.
 */
function Catalogue({ added }: { added: string[] }) {
  const [filter, setFilter] = useState<GameFilter>({});
  const change = (patch: GameFilter) => setFilter((f) => ({ ...f, ...patch }));
  const shown = filterGames(CATALOGUE, filter);
  const filtered = !!(filter.activity || filter.level || filter.moment || filter.query?.trim());

  return (
    <section className="catalogue" aria-labelledby="catalogue-title">
      <h2 id="catalogue-title" className="eyebrow">
        Catalogue
      </h2>
      <div className="filters">
        {CATALOGUE.length >= SEARCH_FROM && (
          <label className="field-label">
            Chercher un jeu
            <input
              type="search"
              className="field"
              autoComplete="off"
              value={filter.query ?? ''}
              onChange={(e) => change({ query: e.target.value })}
            />
          </label>
        )}
        <FilterChips
          label="Type"
          options={activitiesOf(CATALOGUE).map((a) => ({ value: a.value, label: a.name }))}
          value={filter.activity}
          onChange={(activity) => change({ activity })}
        />
        <FilterChips
          label="Âge"
          options={AGE_OPTIONS}
          value={filter.level}
          onChange={(level) => change({ level })}
        />
        <FilterChips
          label="Moment"
          options={MOMENT_OPTIONS}
          value={filter.moment}
          onChange={(moment) => change({ moment })}
        />
        <div className="filters__status">
          <p className="muted" role="status">
            {filtered ? `${countLabel(shown.length)} sur ${CATALOGUE.length}` : ''}
          </p>
          {filtered && (
            <button type="button" className="link-btn" onClick={() => setFilter({})}>
              Retirer les filtres
            </button>
          )}
        </div>
      </div>
      {shown.length === 0 && <p className="muted">Aucun jeu du catalogue pour ces filtres.</p>}
      {groupByActivity(shown).map((group) => (
        <div key={group.activity} className="catalogue__group">
          <h3 className="catalogue__type">{activityName(group.activity)}</h3>
          <ul className="catalogue__list">
            {group.games.map((g) => (
              <CatalogueRow key={g.id} game={g} on={added.includes(g.id)} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function AddGame() {
  const { catalogue } = useSettings();
  const custom = useCustomGames();
  const count = GAMES.length + catalogue.length + (custom?.length ?? 0);

  return (
    <main className="screen">
      {/* Maquette Ajouter : retour et compteur sur une ligne, titre dessous. */}
      <div className="screen-header">
        <a className="icon-btn" href={href('/')} aria-label="Retour">
          <IconBack />
        </a>
        <span className="muted screen-header__aside">{count} jeux dans l'appli</span>
      </div>
      <h1 className="h1">Ajouter un jeu</h1>

      <Catalogue added={catalogue} />

      {custom && custom.length > 0 && (
        <section className="catalogue" aria-labelledby="mine-title">
          <h2 id="mine-title" className="eyebrow">
            Mes jeux
          </h2>
          <ul className="catalogue__list">
            {custom.map((g) => (
              <li key={g.id}>
                <Card className="catalogue-row">
                  <span className="catalogue-row__text">
                    <strong>{g.name}</strong>
                    <span className="muted">
                      {kindLabel(g.kind)} · {activityName(g.activity ?? KIND_ACTIVITY[g.kind])}
                      {g.level && ` · ${ageLabel([g.level])}`} · {g.items.length}{' '}
                      {g.items.length > 1 ? 'cartes' : 'carte'}
                    </span>
                  </span>
                  <a
                    className="pill"
                    href={href(`/creer/${g.id}`)}
                    aria-label={`Modifier ${g.name}`}
                  >
                    Modifier
                  </a>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CreateForm />
      <ImportButton />
    </main>
  );
}
