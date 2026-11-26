import { href } from '../app/router';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { LevelChoice } from '../components/LevelChoice';
import { ModeChoice } from '../components/ModeChoice';
import { Logo } from '../components/Logo';
import { Mascot } from '../components/Mascot';
import { useNightTheme } from '../components/useNightTheme';
import { IconPerson } from '../components/icons';
import { activePlayers, setPlayerActive, usePlayers } from '../data/players';
import { setSetting, useSettings } from '../data/settings';
import { useSeance } from '../data/seance';
import { AnswerModeChoice } from '../games/choices/AnswerModeChoice';
import { BreatheCard } from '../games/respire/BreatheCard';
import { teamsReady } from '../games/teams';
import { MIN_TURN_PLAYERS, type TurnMode } from '../games/turns';
import { usePlayableGames } from '../games/useGames';
import { DailyCard } from './DailyCard';
import { HomeGames } from './HomeGames';
import { LastGame } from './LastGame';
import { SeanceOverCard } from './SeanceOver';
import { TeamsLine } from './TeamsLine';

const TURN_CHOICES: { value: TurnMode; label: string }[] = [
  { value: 'team', label: 'En équipe' },
  { value: 'turns', label: 'Chacun son tour' },
];

/** Tour par tour (#38) : proposé dès deux joueurs actifs ; avec un seul, on joue en équipe. */
function TurnChoice({ value }: { value: TurnMode }) {
  return (
    <fieldset className="setting turn-choice">
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

export function Home() {
  const players = usePlayers();
  const { absentPlayers } = useSettings();
  // Seuls les jeux qui conviennent à la façon de jouer (#42) sont proposés.
  const games = usePlayableGames();
  const { over } = useSeance();
  const night = useNightTheme();
  const { gameLevel, gameMode, turnMode, teams } = useSettings();
  const playing = players ? activePlayers(players, absentPlayers).length : 0;

  return (
    <main className="screen">
      <div className="home__top">
        <Logo />
        <a className="icon-btn" href={href('/parent')} aria-label="Espace parent">
          <IconPerson size={22} />
        </a>
      </div>

      <div className="home__hello">
        <div>
          <h1 className="h1">On joue à quoi ?</h1>
          <p className="lead">
            Le parent tient le téléphone et pose les questions. L'enfant répond à voix haute.
          </p>
        </div>
        {/* Après la séance, la mascotte dort dans la carte « Revenir plus tard ». */}
        {!over && <Mascot mood={night ? 'sleep' : 'hello'} />}
      </div>

      <Card className="players-card">
        <div className="players-card__head">
          <span className="players-card__names">
            <span className="eyebrow" id="players-label">
              {players?.length ? 'Qui joue ?' : 'Joueurs'}
            </span>
            {players === undefined ? (
              <strong>&nbsp;</strong>
            ) : (
              !players.length && <span className="muted">Ajoute le prénom des enfants</span>
            )}
          </span>
          <a href={href('/joueurs')}>{players?.length ? 'Modifier' : 'Ajouter'}</a>
        </div>
        {!!players?.length && (
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
        )}
        {/* En équipes (#44), les équipes jouent à tour de rôle à la place du tour par tour. */}
        {playing >= MIN_TURN_PLAYERS && !teamsReady(teams) && <TurnChoice value={turnMode} />}
        {!over && <TeamsLine />}
      </Card>

      {!over && <DailyCard />}
      {/* Respire comme… (#126) : à part des jeux ; après la séance, dans « Revenir plus tard ». */}
      {!over && <BreatheCard />}

      {/* Niveaux par âge (#40) : le niveau de la partie se règle au lancement. */}
      {!over && (
        <LevelChoice
          legend="Niveau de la partie"
          name="niveau-partie"
          value={gameLevel}
          allLabel="Tous"
          onChange={(level) => void setSetting('gameLevel', level)}
        />
      )}
      {/* Répondre en montrant (#123), réglé lui aussi au lancement. */}
      {!over && <AnswerModeChoice />}

      {/* Façons de jouer (#42) : Normal par défaut, choisie au lancement. */}
      {!over && (
        <ModeChoice value={gameMode} onChange={(mode) => void setSetting('gameMode', mode)} />
      )}

      {over ? <SeanceOverCard /> : <HomeGames games={games} />}

      <div className="spacer" />

      <LastGame />
    </main>
  );
}
