import { useState, type FormEvent } from 'react';
import { href, navigate } from '../app/router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { IconBack } from '../components/icons';
import {
  createCustomGame,
  CustomGameError,
  MAX_GAME_NAME,
  useCustomGames,
} from '../data/customGames';
import { useSettings } from '../data/settings';
import { CATALOGUE } from '../games/catalogue/catalogue';
import { DECK_KINDS, kindLabel, type DeckKind } from '../games/deck/types';
import { GAMES } from '../games/registry';
import { toggleCatalogueGame } from '../games/useGames';

function CreateForm() {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DeckKind>('question');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const id = await createCustomGame(name, kind);
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

      <section className="catalogue" aria-labelledby="catalogue-title">
        <h2 id="catalogue-title" className="eyebrow">
          Catalogue
        </h2>
        <ul className="catalogue__list">
          {CATALOGUE.map((g) => {
            const on = catalogue.includes(g.id);
            return (
              <li key={g.id}>
                <Card className="catalogue-row">
                  <span className={`catalogue-row__mark tint--${g.tint}`} aria-hidden="true">
                    {g.mark}
                  </span>
                  <span className="catalogue-row__text">
                    <strong>{g.name}</strong>
                    <span className="muted">{g.desc}</span>
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
          })}
        </ul>
      </section>

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
                      {kindLabel(g.kind)} · {g.items.length}{' '}
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
    </main>
  );
}
