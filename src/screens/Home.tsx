import { href } from '../app/router';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { IconMusic, IconPencil, IconPerson, IconPlus, IconStar } from '../components/icons';
import { usePlayers } from '../data/players';
import { GAMES, type GameInfo } from '../games/registry';

const ICON_COLOR = { music: 'var(--forest)', letters: 'var(--river)', pencil: 'var(--sun)' };

function TileIcon({ icon }: { icon: GameInfo['icon'] }) {
  return (
    <span className="game-tile__icon" style={{ color: ICON_COLOR[icon] }}>
      {icon === 'music' && <IconMusic size={26} />}
      {icon === 'letters' && 'A1'}
      {icon === 'pencil' && <IconPencil size={26} />}
    </span>
  );
}

export function Home() {
  const players = usePlayers();

  return (
    <main className="screen">
      <div className="home__top">
        <Logo />
        <a className="icon-btn" href={href('/parent')} aria-label="Espace parent">
          <IconPerson size={22} />
        </a>
      </div>

      <div>
        <h1 className="h1">On joue à quoi ?</h1>
        <p className="lead">
          Le parent tient le téléphone et pose les questions. L'enfant répond à voix haute.
        </p>
      </div>

      <Card className="players-card">
        <span className="players-card__names">
          <span className="eyebrow">Joueurs</span>
          {players === undefined ? (
            <strong>&nbsp;</strong>
          ) : players.length ? (
            <strong>{players.map((p) => p.name).join(' · ')}</strong>
          ) : (
            <span className="muted">Ajoute le prénom des enfants</span>
          )}
        </span>
        <a href={href('/joueurs')}>{players?.length ? 'Modifier' : 'Ajouter'}</a>
      </Card>

      <div className="game-grid">
        {GAMES.map((g) => (
          <a key={g.id} href={href(`/jeu/${g.id}`)} className={`game-tile game-tile--${g.tint}`}>
            <TileIcon icon={g.icon} />
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

      <div className="spacer" />

      {/* L'historique des parties arrive avec l'issue #11. */}
      <Card raised className="last-game">
        <IconStar />
        <span>Pas encore de partie : choisis un jeu pour gagner tes premières étoiles.</span>
      </Card>
    </main>
  );
}
