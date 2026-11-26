import { createContext, useContext, useState } from 'react';
import type { Player } from '../data/db';
import { getSettings } from '../data/settings';
import type { Level } from './levels';
import { useSaved } from './session';
import { playsInTurns, startOrder, turnAt } from './turns';

/**
 * Enfant dont c'est le tour, autour de la manche en cours : les choix de « Répondre en
 * montrant » (#123) suivent son niveau. Absent en équipe.
 */
export const TurnPlayer = createContext<Player | undefined>(undefined);

/** Joueurs actifs quand on joue chacun son tour ; `null` en équipe. */
export const TurnPlayers = createContext<Player[] | null>(null);

export interface Turns {
  /** Identifiants des joueurs, dans l'ordre de passage tiré au sort. */
  order: number[];
  /** Enfant dont c'est le tour à la manche `round` (à partir de 1). */
  playerAt: (round: number) => Player;
  /** Niveau des cartes de la manche : celui de l'enfant, sinon le niveau de la partie. */
  levelAt: (round: number) => Level | null;
  /** Niveau de chaque manche, de la première à la `rounds`-ième. */
  levels: (rounds: number) => (Level | null)[];
}

/**
 * Ordre de passage de la partie, tiré au sort au lancement et retrouvé après un
 * rafraîchissement. `null` en équipe, ou avec un seul joueur actif (il joue toutes les manches).
 * À appeler avant les autres états sauvegardés de la partie.
 */
export function useTurns(gameId: string): Turns | null {
  const players = useContext(TurnPlayers);
  const [on] = useState(() => !!players && playsInTurns('turns', players.length));
  const [order] = useSaved<number[]>(
    gameId,
    'turns',
    () => (on && players ? startOrder(players).map((p) => p.id) : []),
    (saved) => {
      if (!Array.isArray(saved)) return undefined;
      const ids = players?.map((p) => p.id) ?? [];
      const ok = on
        ? saved.length === ids.length && ids.every((id) => saved.includes(id))
        : saved.length === 0;
      return ok ? (saved as number[]) : undefined;
    },
  );
  const [turns] = useState<Turns | null>(() => {
    if (!on || !players) return null;
    const byId = new Map(players.map((p) => [p.id, p]));
    const playerAt = (round: number) => byId.get(turnAt(order, round))!;
    const levelAt = (round: number) => playerAt(round).level ?? getSettings().gameLevel;
    return {
      order,
      playerAt,
      levelAt,
      levels: (rounds) => Array.from({ length: rounds }, (_, i) => levelAt(i + 1)),
    };
  });
  return turns;
}
