import { createContext, useContext, useMemo } from 'react';
import { useSaved } from './session';
import type { Team } from './teams';
import { startOrder } from './turns';

/** Équipes de la fête (#44), quand on joue en équipes ; `null` sinon. */
export const PartyTeams = createContext<Team[] | null>(null);

export interface TeamTurns {
  teams: Team[];
  /** Index des équipes, dans l'ordre de passage tiré au sort. */
  order: number[];
}

/**
 * En équipes (#44) : ordre de passage des équipes, tiré au sort au lancement et retrouvé
 * après un rafraîchissement. `null` quand on ne joue pas en équipes.
 */
export function useTeamTurns(gameId: string): TeamTurns | null {
  const teams = useContext(PartyTeams);
  const [order] = useSaved<number[]>(
    gameId,
    'teams',
    () => (teams ? startOrder(teams.map((_, i) => i)) : []),
    (saved) => {
      if (!Array.isArray(saved)) return undefined;
      const n = teams?.length ?? 0;
      const ok =
        saved.length === n &&
        Array.from({ length: n }, (_, i) => i).every((i) => saved.includes(i));
      return ok ? (saved as number[]) : undefined;
    },
  );
  return useMemo(() => (teams ? { teams, order } : null), [teams, order]);
}
