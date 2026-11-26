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
import { NotForMode, NotFound } from '../screens/Placeholder';
import { AddGame } from '../screens/AddGame';
import { EditGame } from '../screens/EditGame';
import { customDeck, parseCustomRouteId, useCustomGame } from '../data/customGames';
import { findCatalogueGame } from '../games/catalogue/catalogue';
import { DeckGame } from '../games/deck/DeckGame';
import { DailyGame } from '../games/defi/DailyGame';
import { DAILY_ID, DAILY_NAME, dailyPick, dayKey } from '../games/defi/daily';
import { modeInfo, needsOf, suitsMode, type PlayNeeds } from '../games/modes';
import { findGame } from '../games/registry';
import { Players } from '../screens/Players';
import { Teams } from '../screens/Teams';
import { Stars } from '../screens/Stars';
import { Privacy } from '../screens/Privacy';
import { BreatheGame } from '../games/respire/BreatheGame';
import { UpdateBanner } from '../pwa/UpdateBanner';
import { TurnsGate } from '../games/TurnsGate';
import { useRoute, type Route } from './router';

const GAME_SCREENS: Record<string, () => React.ReactElement> = {
  chanson: SongGame,
  lettres: LettersGame,
  dessin: DrawingGame,
  [GRAND_ID]: GrandGame,
  defi: DailyGame,
};

/**
 * Façon de jouer (#42) : un jeu ouvert par l'adresse qui ne convient pas au mode choisi
 * (mime au coucher, lettres en voiture) ne démarre pas. Vérifié à l'ouverture seulement.
 */
function ModeGuard({
  title,
  needs,
  children,
}: {
  title: string;
  needs: PlayNeeds | undefined;
  children: React.ReactElement;
}) {
  const { gameMode } = useSettings();
  const [ok] = useState(() => suitsMode(needs, gameMode));
  return ok ? children : <NotForMode title={title} mode={modeInfo(gameMode).name} />;
}

function CustomGameScreen({ id }: { id: number }) {
  const game = useCustomGame(id);
  if (game === undefined) return <main className="screen" />;
  if (game === null) return <NotFound />;
  return (
    <ModeGuard title={game.name} needs={needsOf(game.kind)}>
      <DeckGame deck={customDeck(game)} />
    </ModeGuard>
  );
}

function GameScreen({ id }: { id: string }) {
  const Game = GAME_SCREENS[id];
  const base = findGame(id);
  if (Game && base)
    return (
      <ModeGuard title={base.name} needs={base.needs}>
        <Game />
      </ModeGuard>
    );
  if (id === DAILY_ID)
    return (
      <ModeGuard title={DAILY_NAME} needs={dailyPick(dayKey()).source.needs}>
        <DailyGame />
      </ModeGuard>
    );
  if (Game) return <Game />;
  const catalogue = findCatalogueGame(id);
  if (catalogue)
    return (
      <ModeGuard title={catalogue.name} needs={catalogue.needs}>
        <DeckGame deck={catalogue} />
      </ModeGuard>
    );
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
  return over ? (
    <SeanceOver />
  ) : (
    <TurnsGate>
      <GameScreen id={id} />
    </TurnsGate>
  );
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
    case 'teams':
      return <Teams />;
    case 'add-game':
      return <AddGame />;
    case 'privacy':
      return <Privacy />;
    case 'breathe':
      // Respire comme… (#126) : proposé aussi après la fin de séance et au coucher.
      return <BreatheGame />;
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
