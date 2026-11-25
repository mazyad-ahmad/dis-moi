import { useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconPlus, IconTrash } from '../components/icons';
import { PLAYER_COLORS, type Player } from '../data/db';
import {
  addPlayer,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  PlayerError,
  removePlayer,
  renamePlayer,
  setPlayerColor,
  usePlayers,
} from '../data/players';

function nextColor(p: Player) {
  return PLAYER_COLORS[(PLAYER_COLORS.indexOf(p.color) + 1) % PLAYER_COLORS.length];
}

function PlayerRow({ player, onError }: { player: Player; onError: (m: string) => void }) {
  const [name, setName] = useState(player.name);

  async function commit() {
    if (name === player.name) return;
    try {
      await renamePlayer(player.id, name);
    } catch (e) {
      setName(player.name);
      onError(e instanceof PlayerError ? e.message : 'Impossible de renommer.');
    }
  }

  return (
    <li>
      <Card className="player-row">
        <button
          type="button"
          className={`avatar avatar--${player.color}`}
          aria-label={`Changer la couleur de ${player.name}`}
          onClick={() => setPlayerColor(player.id, nextColor(player))}
        >
          {player.name.charAt(0).toLocaleUpperCase('fr')}
        </button>
        <input
          className="field"
          aria-label={`Prénom de ${player.name}`}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          aria-label={`Retirer ${player.name}`}
          onClick={() => {
            if (window.confirm(`Retirer ${player.name} ?`)) removePlayer(player.id);
          }}
        >
          <IconTrash />
        </button>
      </Card>
    </li>
  );
}

export function Players() {
  const players = usePlayers();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const full = (players?.length ?? 0) >= MAX_PLAYERS;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await addPlayer(draft);
      setDraft('');
    } catch (err) {
      setError(err instanceof PlayerError ? err.message : "Impossible d'ajouter ce prénom.");
    }
  }

  return (
    <main className="screen">
      <ScreenHeader title="Joueurs" back="/" />
      <p className="lead">
        Seul le prénom est enregistré, uniquement sur ce téléphone. Touche la pastille pour changer
        la couleur.
      </p>

      {players && players.length > 0 && (
        <ul className="player-list">
          {players.map((p) => (
            <PlayerRow key={p.id} player={p} onError={setError} />
          ))}
        </ul>
      )}

      {!full ? (
        <form className="add-player" onSubmit={onSubmit}>
          <label htmlFor="new-player" className="sr-only">
            Prénom
          </label>
          <input
            id="new-player"
            className="field"
            placeholder="Prénom"
            autoComplete="off"
            autoCapitalize="words"
            maxLength={MAX_NAME_LENGTH}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" icon={<IconPlus size={20} />} disabled={!draft.trim()}>
            Ajouter
          </Button>
        </form>
      ) : (
        <p className="muted">{MAX_PLAYERS} joueurs maximum.</p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
