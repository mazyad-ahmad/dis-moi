import { href } from '../app/router';
import { IconMusic, IconPencil, IconPlus } from '../components/icons';
import { useActivePlayers } from '../data/players';
import { useSettings } from '../data/settings';
import { homeSections, playLevels } from '../games/activities';
import { GrandTile } from '../games/grand/GrandTile';
import type { GameInfo } from '../games/registry';
import { DailyTile } from './DailyTile';

const ICON_COLOR = { music: 'var(--forest)', letters: 'var(--river)', pencil: 'var(--sun)' };

export function TileIcon({ game: { icon, mark } }: { game: GameInfo }) {
  return (
    <span className="game-tile__icon" style={icon && { color: ICON_COLOR[icon] }}>
      {icon === 'music' && <IconMusic size={26} />}
      {icon === 'letters' && 'A1'}
      {icon === 'pencil' && <IconPencil size={26} />}
      {!icon && mark}
    </span>
  );
}

function GameTile({ game }: { game: GameInfo }) {
  return (
    <a href={href(`/jeu/${game.id}`)} className={`game-tile game-tile--${game.tint}`}>
      <TileIcon game={game} />
      <span>
        <span className="game-tile__name">{game.name}</span>
        <span className="game-tile__category">{game.category}</span>
      </span>
    </a>
  );
}

function AddTile() {
  return (
    <a href={href('/ajouter')} className="game-tile game-tile--add">
      <span className="game-tile__icon">
        <IconPlus />
      </span>
      <span>
        <span className="game-tile__name">Ajouter un jeu</span>
        <span className="game-tile__category">Catalogue ou créer</span>
      </span>
    </a>
  );
}

/**
 * Grille des jeux de l'accueil (#137) : en haut ceux qui conviennent aux joueurs du jour (ou au
 * niveau de la partie), puis « Pour d'autres âges ». Avec peu de jeux, une seule grille comme
 * avant ; avec beaucoup, un groupe par type. Aucun jeu n'est caché.
 */
export function HomeGames({ games }: { games: GameInfo[] }) {
  const players = useActivePlayers() ?? [];
  const { gameLevel } = useSettings();
  const [first, ...rest] = homeSections(games, playLevels(players, gameLevel));
  // Grille simple (premier groupe sans titre) : le Grand Jeu et « Ajouter » y restent, comme avant.
  const simple = !first?.title;
  const titled = simple ? rest : [first, ...rest].filter(Boolean);

  return (
    <div className="home-games">
      <div className="game-grid">
        <GrandTile />
        <DailyTile />
        {simple && first?.games.map((g) => <GameTile key={g.id} game={g} />)}
        {simple && !titled.length && <AddTile />}
      </div>
      {titled.map((section, i) => (
        <section
          key={section.title}
          className="home-games__group"
          aria-labelledby={`home-group-${i}`}
        >
          <h2 id={`home-group-${i}`} className="eyebrow">
            {section.title}
          </h2>
          <div className="game-grid">
            {section.games.map((g) => (
              <GameTile key={g.id} game={g} />
            ))}
            {i === titled.length - 1 && <AddTile />}
          </div>
        </section>
      ))}
    </div>
  );
}
