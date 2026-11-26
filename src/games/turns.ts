import { orderByLevel, type Level } from './levels';
import { shuffle } from './shuffle';

/**
 * Tour par tour (#38) : l'ordre de départ est tiré au sort, puis chacun joue à son tour.
 * Fonctions pures, sans joueur ni base : elles servent aussi aux équipes du mode Fête.
 */

/** Façon de jouer : tous ensemble, ou chacun son tour. */
export type TurnMode = 'team' | 'turns';
export const TURN_MODES = ['team', 'turns'] as const satisfies readonly TurnMode[];

/** Il faut au moins deux joueurs pour jouer chacun son tour ; sinon, on joue en équipe. */
export const MIN_TURN_PLAYERS = 2;

/** Joue-t-on vraiment chacun son tour (réglage choisi et au moins deux joueurs) ? */
export function playsInTurns(mode: TurnMode, players: number): boolean {
  return mode === 'turns' && players >= MIN_TURN_PLAYERS;
}

/** Ordre de départ tiré au sort. */
export function startOrder<T>(players: readonly T[], random?: () => number): T[] {
  return shuffle(players, random);
}

/** Joueur de la manche `round` (à partir de 1) : on suit l'ordre, puis on recommence. */
export function turnAt<T>(order: readonly T[], round: number): T {
  return order[(((round - 1) % order.length) + order.length) % order.length];
}

/** Joueur de chaque manche, de la première à la dernière. */
export function rotation<T>(order: readonly T[], rounds: number): T[] {
  return order.length ? Array.from({ length: rounds }, (_, i) => turnAt(order, i + 1)) : [];
}

/**
 * Prochaine carte au niveau voulu parmi celles pas encore jouées (`used`), avec repli sur le
 * niveau voisin. Toutes jouées : on repart de toutes, sans reprendre la dernière si possible.
 */
export function nextForLevel<T>(
  items: readonly T[],
  level: Level | null | undefined,
  levelOf: (item: T) => Level | undefined,
  used: readonly T[],
  random?: () => number,
  /** Mémoire des cartes vues (#55) : les moins récemment vues d'abord. */
  seenAt?: (item: T) => number,
): T | undefined {
  const fresh = items.filter((item) => !used.includes(item));
  const last = used[used.length - 1];
  const pool = fresh.length ? fresh : items.length > 1 ? items.filter((i) => i !== last) : items;
  return orderByLevel(pool, level, levelOf, random, seenAt)[0];
}

/**
 * Tirage d'une partie en tour par tour : une carte par manche, au niveau de l'enfant de la
 * manche (`levels[i]`), sans répétition tant qu'il reste des cartes.
 */
export function drawForTurns<T>(
  items: readonly T[],
  levels: readonly (Level | null | undefined)[],
  levelOf: (item: T) => Level | undefined,
  random?: () => number,
  seenAt?: (item: T) => number,
): T[] {
  const out: T[] = [];
  let used: T[] = [];
  for (const level of levels) {
    if (used.length >= items.length) used = used.slice(-1);
    const card = nextForLevel(items, level, levelOf, used, random, seenAt);
    if (card === undefined) break;
    out.push(card);
    used.push(card);
  }
  return out;
}
