import { useState } from 'react';
import { href } from '../app/router';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Dialog } from '../components/Dialog';
import { LevelChoice } from '../components/LevelChoice';
import { ModeChoice } from '../components/ModeChoice';
import { activePlayers, setPlayerActive, usePlayers } from '../data/players';
import { useSeance } from '../data/seance';
import { setSetting, useSettings } from '../data/settings';
import { AnswerModeChoice } from '../games/choices/AnswerModeChoice';
import { LEVELS } from '../games/levels';
import { modeInfo } from '../games/modes';
import { teamsReady } from '../games/teams';
import { MIN_TURN_PLAYERS, type TurnMode } from '../games/turns';
import { TeamsLine } from './TeamsLine';

const TURN_CHOICES: { value: TurnMode; label: string }[] = [
  { value: 'team', label: 'En équipe' },
  { value: 'turns', label: 'Chacun son tour' },
];

/** Avatars montrés sur la ligne de l'accueil ; au-delà, les prénoms suffisent. */
const MAX_AVATARS = 4;

/** Tour par tour (#38) : proposé dès deux joueurs actifs ; avec un seul, on joue en équipe. */
function TurnChoice({ value }: { value: TurnMode }) {
  return (
    <fieldset className="setting level-choice">
      <legend className="sr-only">Comment on joue ?</legend>
      <div className="segmented segmented--2">
        {TURN_CHOICES.map((c) => (
          <label key={c.value}>
            <input
              type="radio"
              name="facon-de-jouer"
              value={c.value}
              checked={value === c.value}
              onChange={() => void setSetting('turnMode', c.value)}
            />
            {c.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Panneau « La partie » : tout ce qui se décide avant de jouer, au même endroit. */
function PartySheet({ onClose }: { onClose: () => void }) {
  const players = usePlayers() ?? [];
  const { absentPlayers, gameLevel, gameMode, turnMode, teams } = useSettings();
  const { over } = useSeance();
  const playing = activePlayers(players, absentPlayers).length;
  const inTeams = teamsReady(teams);

  return (
    <Dialog onClose={onClose} labelledBy="party-title" className="dialog--sheet">
      <h2 id="party-title" className="dialog__title">
        La partie
      </h2>

      <section className="setting party-players">
        <div className="party-players__head">
          <span className="eyebrow" id="players-label">
            Qui joue ?
          </span>
          <a href={href('/joueurs')}>{players.length ? 'Modifier' : 'Ajouter'}</a>
        </div>
        {players.length > 0 ? (
          <div className="player-toggles" role="group" aria-labelledby="players-label">
            {players.map((p) => {
              const on = !absentPlayers.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`player-toggle player-toggle--${p.color}`}
                  aria-pressed={on}
                  onClick={() => void setPlayerActive(p.id, !on)}
                >
                  <span aria-hidden="true">
                    <Avatar player={p} size="sm" />
                  </span>
                  <span className="player-toggle__mark" aria-hidden="true">
                    {on ? '✓' : ''}
                  </span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="muted">Ajoute le prénom des enfants.</p>
        )}
        {/* En équipes (#44), les équipes jouent à tour de rôle à la place du tour par tour. */}
        {playing >= MIN_TURN_PLAYERS && !inTeams && <TurnChoice value={turnMode} />}
        {!over && (inTeams ? <TeamsLine /> : <a href={href('/equipes')}>Jouer en équipes</a>)}
      </section>

      {/* Niveaux par âge (#40), répondre en montrant (#123), façons de jouer (#42). */}
      <LevelChoice
        legend="Niveau de la partie"
        name="niveau-partie"
        value={gameLevel}
        allLabel="Tous"
        onChange={(level) => void setSetting('gameLevel', level)}
      />
      <AnswerModeChoice />
      <ModeChoice value={gameMode} onChange={(mode) => void setSetting('gameMode', mode)} />

      <Button block onClick={onClose}>
        Fermer
      </Button>
    </Dialog>
  );
}

/**
 * Ligne « La partie » de l'accueil : qui joue et comment, en une ligne, pour laisser la place
 * aux jeux. Un appui ouvre le panneau où tout se règle.
 */
export function PartyLine() {
  const players = usePlayers();
  const { absentPlayers, gameLevel, gameMode, turnMode, showChoices, teams } = useSettings();
  const [open, setOpen] = useState(false);
  const active = players ? activePlayers(players, absentPlayers) : [];
  const inTeams = teamsReady(teams);

  const who = !players?.length
    ? 'Ajoute le prénom des enfants'
    : inTeams
      ? `En équipes : ${teams.map((t) => t.name).join(', ')}`
      : active.map((p) => p.name).join(', ') || 'Personne ne joue';
  const summary = [
    !inTeams && active.length >= MIN_TURN_PLAYERS && turnMode === 'turns' && 'Chacun son tour',
    LEVELS.find((l) => l.value === gameLevel)?.name ?? 'Tous niveaux',
    showChoices && 'En montrant',
    modeInfo(gameMode).name,
  ].filter(Boolean);

  return (
    <Card className="party">
      <button
        type="button"
        className="party__open"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className="sr-only">La partie : </span>
        {active.length > 0 && (
          <span className="party__avatars" aria-hidden="true">
            {active.slice(0, MAX_AVATARS).map((p) => (
              <Avatar key={p.id} player={p} size="sm" />
            ))}
          </span>
        )}
        <span className="party__text">
          <strong>{players === undefined ? ' ' : who}</strong>
          <span className="muted">{summary.join(' · ')}</span>
        </span>
        {!!players?.length && (
          <span className="party__action" aria-hidden="true">
            Changer
          </span>
        )}
      </button>
      {players?.length === 0 && <a href={href('/joueurs')}>Ajouter</a>}
      {open && <PartySheet onClose={() => setOpen(false)} />}
    </Card>
  );
}
