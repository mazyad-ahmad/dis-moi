import { useState, type ReactNode } from 'react';
import { useActivePlayers } from '../data/players';
import { getSettings } from '../data/settings';
import { TurnPlayers } from './useTurns';

/**
 * Tour par tour (#38) : attend les joueurs actifs avant de lancer la partie, pour que le
 * tirage soit fait au niveau de chaque enfant dès le premier rendu. En équipe, rien à attendre.
 */
export function TurnsGate({ children }: { children: ReactNode }) {
  const [mode] = useState(() => getSettings().turnMode);
  const players = useActivePlayers();
  if (mode !== 'turns') return <>{children}</>;
  if (players === undefined) return <main className="screen" />;
  return <TurnPlayers.Provider value={players}>{children}</TurnPlayers.Provider>;
}
