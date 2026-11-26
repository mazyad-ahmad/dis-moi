import { shuffle } from './shuffle';

/**
 * Niveaux par âge (#40) : chaque carte du contenu intégré porte un niveau (champ `level`).
 * Un joueur peut avoir un niveau ; en équipe, le niveau de la partie se règle sur l'accueil.
 * Sans niveau choisi, toutes les cartes sont tirées comme avant.
 */
export type Level = 1 | 2 | 3;

export interface LevelInfo {
  value: Level;
  /** Nom court montré au parent. */
  name: string;
  /** Tranche d'âge, en clair. */
  ages: string;
  /** Âges couverts (bornes comprises) ; `maxAge` absent pour le dernier niveau. */
  minAge: number;
  maxAge?: number;
}

export const LEVELS: readonly LevelInfo[] = [
  { value: 1, name: 'Petits', ages: '3-4 ans', minAge: 3, maxAge: 4 },
  { value: 2, name: 'Moyens', ages: '5-6 ans', minAge: 5, maxAge: 6 },
  { value: 3, name: 'Grands', ages: '7 ans et plus', minAge: 7 },
];

export const MIN_LEVEL: Level = 1;
export const MAX_LEVEL: Level = 3;

export function isLevel(value: unknown): value is Level {
  return value === 1 || value === 2 || value === 3;
}

export function levelInfo(level: Level): LevelInfo {
  return LEVELS.find((l) => l.value === level)!;
}

/** Niveau d'un âge en années (avant 3 ans : Petits). */
export function levelForAge(age: number): Level {
  return LEVELS.find((l) => l.maxAge === undefined || age <= l.maxAge)!.value;
}

/**
 * Proximité d'une carte au niveau voulu : 0 pour le bon niveau (ou une carte sans niveau,
 * qui convient à tous), puis le niveau voisin, le plus facile d'abord à égale distance.
 */
function distance(card: Level | undefined, wanted: Level): number {
  if (card === undefined || card === wanted) return 0;
  return Math.abs(card - wanted) * 2 + (card > wanted ? 1 : 0);
}

/** Cartes à deux niveaux du niveau voulu : jamais servies avant les autres, même déjà vues. */
const FAR = 4;

/**
 * Mélange les cartes en mettant d'abord celles du niveau voulu, puis les niveaux voisins :
 * un tirage ne manque jamais de cartes. Sans niveau (`null`), simple mélange.
 * Avec `seenAt` (mémoire des cartes vues, #55) : les cartes jamais vues d'abord, puis les plus
 * anciennes, avant le niveau ; une carte à deux niveaux d'écart reste en dernier.
 */
export function orderByLevel<T>(
  items: readonly T[],
  level: Level | null | undefined,
  levelOf: (item: T) => Level | undefined,
  random?: () => number,
  seenAt?: (item: T) => number,
): T[] {
  const mixed = shuffle(items, random);
  if (!level && !seenAt) return mixed;
  // Tri stable : le mélange est gardé à égalité.
  return mixed
    .map((item) => {
      const d = level ? distance(levelOf(item), level) : 0;
      return { item, d, far: d >= FAR ? 1 : 0, seen: seenAt?.(item) ?? 0 };
    })
    .sort((a, b) => a.far - b.far || a.seen - b.seen || a.d - b.d)
    .map(({ item }) => item);
}

/** Tire `count` cartes sans répétition, au niveau voulu d'abord (moins si la liste est courte). */
export function drawForLevel<T>(
  items: readonly T[],
  count: number,
  level: Level | null | undefined,
  levelOf: (item: T) => Level | undefined,
  random?: () => number,
  seenAt?: (item: T) => number,
): T[] {
  return orderByLevel(items, level, levelOf, random, seenAt).slice(0, count);
}

/**
 * Tire une seule carte au niveau voulu parmi celles pas encore jouées (`used`), avec le même
 * repli sur le niveau voisin. Toutes jouées : on repart de toutes les cartes.
 * Prévu pour le tour par tour : une carte au niveau de l'enfant dont c'est le tour.
 */
export function pickForLevel<T>(
  items: readonly T[],
  level: Level | null | undefined,
  levelOf: (item: T) => Level | undefined,
  used: (item: T) => boolean = () => false,
  random?: () => number,
): T | undefined {
  const fresh = items.filter((item) => !used(item));
  return orderByLevel(fresh.length ? fresh : items, level, levelOf, random)[0];
}

/** Niveau d'une carte qui en porte un (`level`), sinon aucun. */
export function cardLevel(item: { level?: number }): Level | undefined {
  return isLevel(item.level) ? item.level : undefined;
}
