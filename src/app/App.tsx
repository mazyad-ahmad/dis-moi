import { useState } from 'react';
import { BottomNav, type Tab } from '../components/BottomNav';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useApplyTheme, useSettings } from '../data/settings';
import { isProtected, useUnlocked } from '../data/parentLock';
import { isSeanceOver } from '../data/seance';
import { SeanceOver } from '../screens/SeanceOver';
import { Home } from '../screens/Home';
import { Parent } from '../screens/Parent';
import { ParentGate } from '../screens/ParentGate';
import { SongGame } from '../games/chanson/SongGame';
import { DrawingGame } from '../games/dessin/DrawingGame';
import { LettersGame } from '../games/lettres/LettersGame';
import { GrandGame } from '../games/grand/GrandGame';
import { GRAND_ID } from '../games/grand/pool';
import { NotFound } from '../screens/Placeholder';
import { AddGame } from '../screens/AddGame';
import { EditGame } from '../screens/EditGame';
import { customDeck, parseCustomRouteId, useCustomGame } from '../data/customGames';
import { findCatalogueGame } from '../games/catalogue/catalogue';
import { DeckGame } from '../games/deck/DeckGame';
import { Players } from '../screens/Players';
import { Stars } from '../screens/Stars';
import { Privacy } from '../screens/Privacy';
import { UpdateBanner } from '../pwa/UpdateBanner';
import { useRoute, type Route } from './router';

const GAME_SCREENS: Record<string, () => React.ReactElement> = {
  chanson: SongGame,
  lettres: LettersGame,
  dessin: DrawingGame,
  [GRAND_ID]: GrandGame,
};

function CustomGameScreen({ id }: { id: number }) {
  const game = useCustomGame(id);
  if (game === undefined) return <main className="screen" />;
  if (game === null) return <NotFound />;
  return <DeckGame deck={customDeck(game)} />;
}

function GameScreen({ id }: { id: string }) {
  const Game = GAME_SCREENS[id];
  if (Game) return <Game />;
  const catalogue = findCatalogueGame(id);
  if (catalogue) return <DeckGame deck={catalogue} />;
  const custom = parseCustomRouteId(id);
  if (custom !== undefined) return <CustomGameScreen id={custom} />;
  return <NotFound />;
}

/**
 * Fin de séance (#120) : un jeu ouvert après l'échéance (par l'adresse) ne démarre pas.
 * Vérifié à l'ouverture seulement : la partie qui vient de finir garde son écran de fin.
 */
function GuardedGame({ id }: { id: string }) {
  const [over] = useState(() => isSeanceOver());
  return over ? <SeanceOver /> : <GameScreen id={id} />;
}

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
      return <AddGame />;
    case 'privacy':
      return <Privacy />;
    case 'edit-game':
      return <EditGame key={route.id} id={route.id} />;
    case 'game':
      // key : changer de jeu repart d'une partie neuve.
      return <GuardedGame key={route.id} id={route.id} />;
    case 'not-found':
      return <NotFound />;
  }
}

/** Verrou parent : vrai si l'écran demandé doit d'abord passer par l'opération. */
function useLocked(route: Route): boolean {
  const { parentLock } = useSettings();
  const unlocked = useUnlocked();
  return parentLock && isProtected(route) && !unlocked;
}

const TAB_OF: Partial<Record<Route['name'], Tab>> = {
  home: 'home',
  stars: 'stars',
  parent: 'parent',
};

export function App() {
  useApplyTheme();
  const route = useRoute();
  const locked = useLocked(route);
  const tab = TAB_OF[route.name];
  return (
    <div className="app">
      <UpdateBanner />
      <ErrorBoundary resetKey={JSON.stringify(route)}>
        {locked ? <ParentGate /> : screenFor(route)}
      </ErrorBoundary>
      {tab && <BottomNav active={tab} />}
    </div>
  );
}
