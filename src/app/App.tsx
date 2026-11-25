import { BottomNav, type Tab } from '../components/BottomNav';
import { useApplyTheme } from '../data/settings';
import { Home } from '../screens/Home';
import { Parent } from '../screens/Parent';
import { SongGame } from '../games/chanson/SongGame';
import { DrawingGame } from '../games/dessin/DrawingGame';
import { LettersGame } from '../games/lettres/LettersGame';
import { AddGamePlaceholder, NotFound } from '../screens/Placeholder';
import { Players } from '../screens/Players';
import { Stars } from '../screens/Stars';
import { useRoute, type Route } from './router';

const GAME_SCREENS: Record<string, () => React.ReactElement> = {
  chanson: SongGame,
  lettres: LettersGame,
  dessin: DrawingGame,
};

function screenFor(route: Route) {
  switch (route.name) {
    case 'home':
      return <Home />;
    case 'stars':
      return <Stars />;
    case 'parent':
      return <Parent />;
    case 'players':
      return <Players />;
    case 'add-game':
      return <AddGamePlaceholder />;
    case 'game': {
      const Game = GAME_SCREENS[route.id];
      // key : changer de jeu repart d'une partie neuve.
      return Game ? <Game key={route.id} /> : <NotFound />;
    }
    case 'not-found':
      return <NotFound />;
  }
}

const TAB_OF: Partial<Record<Route['name'], Tab>> = {
  home: 'home',
  stars: 'stars',
  parent: 'parent',
};

export function App() {
  useApplyTheme();
  const route = useRoute();
  const tab = TAB_OF[route.name];
  return (
    <div className="app">
      {screenFor(route)}
      {tab && <BottomNav active={tab} />}
    </div>
  );
}
