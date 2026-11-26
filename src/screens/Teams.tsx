import { useState, type FormEvent } from 'react';
import { navigate } from '../app/router';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconClose, IconPlus } from '../components/icons';
import { PLAYER_COLORS, type Player } from '../data/db';
import {
  cleanName,
  COLOR_NAMES,
  MAX_NAME_LENGTH,
  PlayerError,
  useActivePlayers,
  usePlayers,
} from '../data/players';
import { getSettings, setSetting } from '../data/settings';
import {
  addMember,
  allMembers,
  childCount,
  MAX_CHILDREN,
  MAX_TEAM_NAME,
  MAX_TEAMS,
  MIN_TEAMS,
  moveMember,
  newTeams,
  readTeams,
  removeMember,
  setTeamCount,
  spread,
  teamName,
  teamsReady,
  updateTeam,
  type Team,
} from '../games/teams';

/** Jouer en équipes (#44) : écran du parent, attend les joueurs de la famille. */
export function Teams() {
  const players = usePlayers();
  const active = useActivePlayers();
  if (!players || !active) return <main className="screen" />;
  return <TeamsEditor players={players} active={active} />;
}

function TeamCard({
  team,
  index,
  teams,
  onChange,
}: {
  team: Team;
  index: number;
  teams: Team[];
  onChange: (teams: Team[]) => void;
}) {
  const label = team.name.trim() || `l’équipe ${index + 1}`;
  return (
    <Card className={`team-card turn-banner--${team.color}`}>
      <input
        className="field team-card__name"
        aria-label={`Nom de l’équipe ${index + 1}`}
        value={team.name}
        maxLength={MAX_TEAM_NAME}
        autoComplete="off"
        onChange={(e) => onChange(updateTeam(teams, index, { name: e.target.value }))}
      />
      <fieldset className="team-card__colors">
        <legend className="sr-only">Couleur de {label}</legend>
        {PLAYER_COLORS.map((c) => {
          const taken = teams.some((t, i) => i !== index && t.color === c);
          return (
            <label key={c} className="avatar-choice team-card__color">
              <input
                type="radio"
                name={`equipe-${index}-couleur`}
                aria-label={COLOR_NAMES[c]}
                checked={team.color === c}
                disabled={taken}
                onChange={() => onChange(updateTeam(teams, index, { color: c }))}
              />
              <span
                className={`avatar-choice__swatch avatar--${c}${taken ? ' is-taken' : ''}`}
                aria-hidden="true"
              />
            </label>
          );
        })}
      </fieldset>
      {team.members.length ? (
        <ul className="team-card__members" aria-label={`Enfants de ${label}`}>
          {team.members.map((m, j) => (
            <li key={`${j}-${m.name}`} className="team-member">
              <button
                type="button"
                className="team-member__move"
                aria-label={`${m.name} : changer d’équipe`}
                onClick={() => onChange(moveMember(teams, index, j))}
              >
                {m.name}
                {m.playerId === undefined && <span className="team-member__guest"> (invité)</span>}
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--plain team-member__remove"
                aria-label={`Retirer ${m.name} des équipes`}
                onClick={() => onChange(removeMember(teams, index, j))}
              >
                <IconClose size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Pas encore d’enfant dans cette équipe.</p>
      )}
    </Card>
  );
}

function TeamsEditor({ players, active }: { players: Player[]; active: Player[] }) {
  const [saved] = useState(() => readTeams(getSettings().teams));
  const [teams, setTeams] = useState<Team[]>(
    () => saved ?? newTeams(active.map((p) => ({ name: p.name, playerId: p.id }))),
  );
  const [guest, setGuest] = useState('');
  const [error, setError] = useState('');
  const count = childCount(teams);
  const full = count >= MAX_CHILDREN;
  const placed = new Set(allMembers(teams).flatMap((m) => (m.playerId ? [m.playerId] : [])));
  const family = players.filter((p) => !placed.has(p.id));
  const ready = teamsReady(teams);

  function change(next: Team[]) {
    setError('');
    setTeams(next);
  }

  function addGuest(e: FormEvent) {
    e.preventDefault();
    try {
      change(addMember(teams, { name: cleanName(guest) }));
      setGuest('');
    } catch (err) {
      setError(err instanceof PlayerError ? err.message : 'Impossible d’ajouter ce prénom.');
    }
  }

  async function start() {
    if (!ready) return;
    await setSetting(
      'teams',
      teams.map((t, i) => ({ ...t, name: teamName(t.name, i) })),
    );
    navigate('/');
  }

  async function stop() {
    await setSetting('teams', null);
    navigate('/');
  }

  return (
    <main className="screen">
      <ScreenHeader title="Jouer en équipes" back="/" />
      <p className="lead">
        Pour une fête ou les cousins : les équipes jouent à tour de rôle et toutes les étoiles
        s’ajoutent à celles de la famille. Les invités ne sont pas enregistrés.
      </p>

      <fieldset className="setting">
        <legend className="eyebrow">Nombre d’équipes</legend>
        <div className="segmented segmented--2">
          {Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => MIN_TEAMS + i).map((n) => (
            <label key={n}>
              <input
                type="radio"
                name="nombre-equipes"
                checked={teams.length === n}
                onChange={() => change(spread(setTeamCount(teams, n)))}
              />
              {n} équipes
            </label>
          ))}
        </div>
      </fieldset>

      <p className="muted">Touche un prénom pour le faire passer dans l’équipe suivante.</p>
      <div className="team-list">
        {teams.map((t, i) => (
          <TeamCard key={i} team={t} index={i} teams={teams} onChange={change} />
        ))}
      </div>

      <section className="team-add" aria-labelledby="team-add-title">
        <h2 id="team-add-title" className="eyebrow">
          Ajouter des enfants ({count} sur {MAX_CHILDREN})
        </h2>
        {!full && family.length > 0 && (
          <div className="player-toggles">
            {family.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`player-toggle player-toggle--${p.color}`}
                onClick={() => change(addMember(teams, { name: p.name, playerId: p.id }))}
              >
                <span aria-hidden="true">
                  <Avatar player={p} size="sm" />
                </span>
                <span>Ajouter {p.name}</span>
              </button>
            ))}
          </div>
        )}
        {full ? (
          <p className="muted">{MAX_CHILDREN} enfants au maximum.</p>
        ) : (
          <form className="add-player" onSubmit={addGuest}>
            <label htmlFor="new-guest" className="sr-only">
              Prénom de l’invité
            </label>
            <input
              id="new-guest"
              className="field"
              placeholder="Prénom de l’invité"
              autoComplete="off"
              autoCapitalize="words"
              maxLength={MAX_NAME_LENGTH}
              value={guest}
              onChange={(e) => setGuest(e.target.value)}
            />
            <Button type="submit" icon={<IconPlus size={20} />} disabled={!guest.trim()}>
              Ajouter
            </Button>
          </form>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      {count > 1 && (
        <Button variant="secondary" block onClick={() => change(spread(teams))}>
          Mélanger les équipes
        </Button>
      )}

      <div className="spacer" />

      {!ready && (
        <p className="muted" role="status">
          Chaque équipe a besoin d’au moins un enfant.
        </p>
      )}
      <Button block disabled={!ready} onClick={() => void start()}>
        C’est parti !
      </Button>
      {saved && (
        <Button variant="ghost" block onClick={() => void stop()}>
          Arrêter les équipes
        </Button>
      )}
    </main>
  );
}
