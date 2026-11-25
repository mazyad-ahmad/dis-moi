import { BottomNav, type Tab } from '../components/BottomNav';
import { useApplyTheme } from '../data/settings';
import { Home } from '../screens/Home';
import { Parent } from '../screens/Parent';
import { AddGamePlaceholder, GamePlaceholder, NotFound } from '../screens/Placeholder';
import { Players } from '../screens/Players';
import { Stars } from '../screens/Stars';
import { useRoute, type Route } from './router';

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
    case 'game':
      return <GamePlaceholder id={route.id} />;
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
