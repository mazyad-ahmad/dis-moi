import type { DeckItem } from '../deck/types';
import { cardLevel, orderByLevel, type Level } from '../levels';
import { shuffle } from '../shuffle';

/**
 * Qu'est-ce qui a disparu ? (#64) : l'enfant regarde quelques objets, le parent les cache,
 * en retire un (ou en ajoute un, variante « Qu'est-ce qui est arrivé ? »), puis les remontre.
 * Une carte de `src/content/catalogue-disparu.json` est l'objet qui disparaît (ou arrive) ;
 * les autres objets de la scène sont pris parmi les autres cartes du jeu, du même niveau d'abord.
 */
export const DISPARU_ID = 'disparu';

export type DisparuVariant = 'disparu' | 'arrive';

export const DISPARU_VARIANTS: readonly { value: DisparuVariant; label: string }[] = [
  { value: 'disparu', label: 'Un objet disparaît' },
  { value: 'arrive', label: 'Un objet arrive' },
];

export function isDisparuVariant(value: unknown): value is DisparuVariant {
  return value === 'disparu' || value === 'arrive';
}

/** Question posée quand les objets reviennent. */
export const VARIANT_QUESTION: Record<DisparuVariant, string> = {
  disparu: 'Qu’est-ce qui a disparu ?',
  arrive: 'Qu’est-ce qui est arrivé ?',
};

/** Règle de la scène selon le niveau de la carte. */
export interface SceneRule {
  /** Objets montrés pendant l'observation. */
  count: number;
  /** Colonnes de la scène. */
  columns: number;
  /** Les objets changent de place quand ils reviennent. */
  moves: boolean;
}

/**
 * Petits : 3 objets qui restent à leur place (une case vide montre où il manque).
 * Moyens : 5 objets, toujours à leur place. Grands : 6 objets qui changent de place.
 */
export const SCENE_RULES: Record<Level, SceneRule> = {
  1: { count: 3, columns: 2, moves: false },
  2: { count: 5, columns: 3, moves: false },
  3: { count: 6, columns: 3, moves: true },
};

/** Carte sans niveau (aucune dans le contenu intégré) : comme les Moyens. */
export function sceneRule(item: DeckItem): SceneRule {
  return SCENE_RULES[cardLevel(item) ?? 2];
}

/** Une case de la scène : un objet, ou une place vide (`null`). */
export type Spot = DeckItem | null;

export interface DisparuScene {
  rule: SceneRule;
  /** Ce que l'enfant observe. */
  before: Spot[];
  /** Ce qu'il voit quand les objets reviennent. */
  after: Spot[];
  /** Les autres objets de la scène, restés là (pour « Répondre en montrant »). */
  stay: DeckItem[];
  /** Case de l'objet qui a disparu (dans `before`) ou qui est arrivé (dans `after`). */
  spot: number;
}

const sameObject = (a: DeckItem, b: DeckItem) => a.answer === b.answer || a.emoji === b.emoji;

/**
 * Objets qui accompagnent la carte : assez pour les deux variantes, sans doublon (ni même
 * nom ni même image), ceux du niveau de la carte d'abord.
 */
export function drawCompanions(
  item: DeckItem,
  pool: readonly DeckItem[],
  random: () => number = Math.random,
): DeckItem[] {
  const picked: DeckItem[] = [];
  for (const other of orderByLevel(pool, cardLevel(item), cardLevel, random)) {
    if (picked.length === sceneRule(item).count) break;
    if (other.emoji && !sameObject(other, item) && !picked.some((p) => sameObject(p, other)))
      picked.push(other);
  }
  return picked;
}

/**
 * Scène d'une manche, tirée une fois pour la manche, avec les objets de `drawCompanions`.
 * - Places fixes : une case de plus que d'objets ; l'objet disparu laisse sa case vide,
 *   l'objet qui arrive prend la case libre.
 * - Places qui changent : pas de case vide, les objets reviennent mélangés.
 */
export function buildScene(
  item: DeckItem,
  companions: readonly DeckItem[],
  variant: DisparuVariant,
  random: () => number = Math.random,
): DisparuScene {
  const rule = sceneRule(item);
  const n = Math.min(rule.count, companions.length + (variant === 'disparu' ? 1 : 0));
  const others = companions.slice(0, variant === 'disparu' ? n - 1 : n);
  // L'objet de la carte à une place tirée au hasard parmi les objets observés.
  const at = Math.min(others.length, Math.floor(random() * (others.length + 1)));
  if (rule.moves) {
    if (variant === 'disparu') {
      const before = [...others.slice(0, at), item, ...others.slice(at)];
      return { rule, before, after: mixed(others, random), stay: others, spot: at };
    }
    const after = mixed([...others, item], random);
    return { rule, before: [...others], after, stay: others, spot: after.indexOf(item) };
  }
  // Places fixes : une case de plus que d'objets, la case libre tirée au hasard.
  const objects: DeckItem[] =
    variant === 'disparu' ? [...others.slice(0, at), item, ...others.slice(at)] : [...others];
  const free = Math.min(objects.length, Math.floor(random() * (objects.length + 1)));
  const before: Spot[] = [...objects.slice(0, free), null, ...objects.slice(free)];
  if (variant === 'arrive') {
    // L'objet arrive dans la case libre, les autres ne bougent pas.
    const after = before.map((s, i) => (i === free ? item : s));
    return { rule, before, after, stay: others, spot: free };
  }
  const spot = before.indexOf(item);
  const after = before.map((s) => (s === item ? null : s));
  return { rule, before, after, stay: others, spot };
}

/** Objets mélangés, dans un autre ordre que celui de départ quand c'est possible. */
function mixed(objects: readonly DeckItem[], random: () => number): DeckItem[] {
  for (let tries = 0; tries < 5; tries++) {
    const out = shuffle(objects, random);
    if (out.some((o, i) => o !== objects[i])) return out;
  }
  // Toujours le même ordre (hasard figé) : on décale d'une case.
  return objects.length > 1 ? [...objects.slice(1), objects[0]] : [...objects];
}

const ROWS: Record<number, string[]> = {
  1: [''],
  2: ['en haut', 'en bas'],
  3: ['en haut', 'au milieu', 'en bas'],
};
const COLUMNS: Record<number, string[]> = {
  2: ['à gauche', 'à droite'],
  3: ['à gauche', 'au milieu', 'à droite'],
};

/** Place d'une case, dite au parent : « en haut à gauche », « au milieu ». */
export function placeName(index: number, columns: number, cells: number): string {
  const rows = Math.max(1, Math.ceil(cells / columns));
  const row = ROWS[rows]?.[Math.floor(index / columns)] ?? '';
  const col = COLUMNS[columns]?.[index % columns] ?? '';
  if (row === 'au milieu' && col === 'au milieu') return 'au milieu';
  return [row, col].filter(Boolean).join(' ');
}
