import { href } from '../app/router';
import { Avatar } from '../components/Avatar';
import { Card } from '../components/Card';
import { LevelChoice } from '../components/LevelChoice';
import { Logo } from '../components/Logo';
import { Mascot } from '../components/Mascot';
import { useNightTheme } from '../components/useNightTheme';
import { IconMusic, IconPencil, IconPerson, IconPlus } from '../components/icons';
import { usePlayers } from '../data/players';
import { setSetting, useSettings } from '../data/settings';
import { useSeance } from '../data/seance';
import type { GameInfo } from '../games/registry';
import { useHomeGames } from '../games/useGames';
import { LastGame } from './LastGame';
import { SeanceOverCard } from './SeanceOver';

const ICON_COLOR = { music: 'var(--forest)', letters: 'var(--river)', pencil: 'var(--sun)' };

function TileIcon({ game: { icon, mark } }: { game: GameInfo }) {
  return (
    <span className="game-tile__icon" style={icon && { color: ICON_COLOR[icon] }}>
      {icon === 'music' && <IconMusic size={26} />}
      {icon === 'letters' && 'A1'}
      {icon === 'pencil' && <IconPencil size={26} />}
      {!icon && mark}
    </span>
  );
}

export function Home() {
  const players = usePlayers();
  const games = useHomeGames();
  const { over } = useSeance();
  const night = useNightTheme();
  const { gameLevel } = useSettings();

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
        <span className="players-card__names">
          <span className="eyebrow">Joueurs</span>
          {players === undefined ? (
            <strong>&nbsp;</strong>
          ) : players.length ? (
            <>
              <span className="avatar-row">
                {players.map((p) => (
                  <Avatar key={p.id} player={p} size="sm" />
                ))}
              </span>
              <strong>{players.map((p) => p.name).join(' · ')}</strong>
            </>
          ) : (
            <span className="muted">Ajoute le prénom des enfants</span>
          )}
        </span>
        <a href={href('/joueurs')}>{players?.length ? 'Modifier' : 'Ajouter'}</a>
      </Card>

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

      {over ? (
        <SeanceOverCard />
      ) : (
        <div className="game-grid">
          {games.map((g) => (
            <a key={g.id} href={href(`/jeu/${g.id}`)} className={`game-tile game-tile--${g.tint}`}>
              <TileIcon game={g} />
              <span>
                <span className="game-tile__name">{g.name}</span>
                <span className="game-tile__category">{g.category}</span>
              </span>
            </a>
          ))}
          <a href={href('/ajouter')} className="game-tile game-tile--add">
            <span className="game-tile__icon">
              <IconPlus />
            </span>
            <span>
              <span className="game-tile__name">Ajouter un jeu</span>
              <span className="game-tile__category">Catalogue ou créer</span>
            </span>
          </a>
        </div>
      )}

      <div className="spacer" />

      <LastGame />
    </main>
  );
}
