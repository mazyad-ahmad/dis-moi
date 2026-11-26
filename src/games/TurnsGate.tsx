import { useState, type ReactNode } from 'react';
import { useActivePlayers } from '../data/players';
import { getSettings } from '../data/settings';
import { teamsReady } from './teams';
import { PartyTeams } from './useTeams';
import { TurnPlayers } from './useTurns';

/**
 * Tour par tour (#38) : attend les joueurs actifs avant de lancer la partie, pour que le
 * tirage soit fait au niveau de chaque enfant dès le premier rendu. En équipe, rien à attendre.
 * En équipes (#44), les équipes jouent à tour de rôle, à la place du tour par tour.
 */
export function TurnsGate({ children }: { children: ReactNode }) {
  const [mode] = useState(() => getSettings().turnMode);
  const [teams] = useState(() => {
    const saved = getSettings().teams;
    return teamsReady(saved) ? saved : null;
  });
  const players = useActivePlayers();
  if (teams) return <PartyTeams.Provider value={teams}>{children}</PartyTeams.Provider>;
  if (mode !== 'turns') return <>{children}</>;
  if (players === undefined) return <main className="screen" />;
  return <TurnPlayers.Provider value={players}>{children}</TurnPlayers.Provider>;
}
