import { useState, type FormEvent } from 'react';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useConfirm } from '../components/useConfirm';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconPlus, IconTrash } from '../components/icons';
import type { Player } from '../data/db';
import {
  addPlayer,
  avatarLabel,
  freeAvatar,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  PlayerError,
  removePlayer,
  renamePlayer,
  setPlayerAvatar,
  usePlayers,
  type Avatar as AvatarValue,
} from '../data/players';
import { AvatarPicker } from './AvatarPicker';

function PlayerRow({ player, onError }: { player: Player; onError: (m: string) => void }) {
  const [name, setName] = useState(player.name);
  const [confirmDialog, confirm] = useConfirm();
  const [picking, setPicking] = useState(false);

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
          className="avatar-btn"
          aria-label={`Changer l’avatar de ${avatarLabel(player)}`}
          onClick={() => setPicking(true)}
        >
          <Avatar player={player} />
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
          onClick={async () => {
            const ok = await confirm({
              title: `Retirer ${player.name} ?`,
              confirmLabel: 'Retirer',
              danger: true,
            });
            if (ok) await removePlayer(player.id);
          }}
        >
          <IconTrash />
        </button>
      </Card>
      {confirmDialog}
      {picking && (
        <AvatarPicker
          name={player.name}
          value={player}
          onChange={(avatar) => setPlayerAvatar(player.id, avatar)}
          onClose={() => setPicking(false)}
        />
      )}
    </li>
  );
}

export function Players() {
  const players = usePlayers();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  // Avatar du prochain joueur : choisi par le parent, sinon le premier libre.
  const [draftAvatar, setDraftAvatar] = useState<AvatarValue | null>(null);
  const [picking, setPicking] = useState(false);
  const nextAvatar = draftAvatar ?? freeAvatar(players ?? []);
  const draftName = draft.trim() || 'Nouveau joueur';
  const full = (players?.length ?? 0) >= MAX_PLAYERS;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await addPlayer(draft, nextAvatar);
      setDraft('');
      setDraftAvatar(null);
    } catch (err) {
      setError(err instanceof PlayerError ? err.message : "Impossible d'ajouter ce prénom.");
    }
  }

  return (
    <main className="screen">
      <ScreenHeader title="Joueurs" back="/" />
      <p className="lead">
        Seuls le prénom et l’avatar sont enregistrés, uniquement sur ce téléphone. Touche l’animal
        pour le changer, ou changer sa couleur.
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
          <button
            type="button"
            className="avatar-btn"
            aria-label={`Choisir l’avatar du nouveau joueur : ${nextAvatar.animal}`}
            onClick={() => setPicking(true)}
          >
            <Avatar player={{ name: draftName, ...nextAvatar }} />
          </button>
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

      {picking && !full && (
        <AvatarPicker
          name={draftName}
          value={nextAvatar}
          onChange={setDraftAvatar}
          onClose={() => setPicking(false)}
        />
      )}
    </main>
  );
}
