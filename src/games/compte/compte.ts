import { deckItems, getPack } from '../../content/packs';
import type { DeckItem } from '../deck/types';
import { cardLevel, type Level } from '../levels';
import { shuffle } from '../shuffle';

/**
 * Compte avec moi (#65) : des objets (emoji) à compter, deux groupes à comparer et, pour les
 * grands, de petites additions et soustractions en images. Les cartes du pack
 * (`src/content/catalogue-compte.json`) ne sont que les objets (`emoji`, `answer` : « Les
 * pommes ») ; chaque manche est **générée** au hasard d'après le niveau de l'objet tiré :
 * nombres, type de question, place des objets. Jamais deux parties identiques.
 */
export const COMPTE_ID = 'compte';

/** Objets du jeu (cartes du pack). */
export const COMPTE_OBJECTS: DeckItem[] = deckItems(getPack(COMPTE_ID));

export type CountKind = 'count' | 'compare' | 'add' | 'sub';

/** Plus grand nombre d'objets d'un groupe, par niveau : 5, 10, 20 (critère de l'issue). */
export const MAX_COUNT: Record<Level, number> = { 1: 5, 2: 10, 3: 20 };

/**
 * Types de question par niveau, répétés pour la fréquence : surtout compter ; comparer pour
 * tous ; additions et soustractions pour les grands.
 */
const KINDS: Record<Level, CountKind[]> = {
  1: ['count', 'count', 'compare'],
  2: ['count', 'count', 'compare'],
  3: ['count', 'add', 'sub', 'compare'],
};

/** Taille d'une case du champ, en unités du dessin (SVG). */
export const CELL = 100;
/**
 * Taille de l'emoji et décalage maximal autour du centre de sa case : même avec une police
 * large (un emoji fait jusqu'à 1,2 fois sa taille), l'objet reste dans sa case, donc deux
 * objets ne se chevauchent jamais.
 */
export const EMOJI_SIZE = 60;
export const JITTER = 10;

/** Un objet placé : centre, en unités du dessin. */
export interface Spot {
  x: number;
  y: number;
}

/** Un champ d'objets : une grille invisible de cases, un objet au plus par case. */
export interface Field {
  cols: number;
  rows: number;
  spots: Spot[];
  /** Soustraction : places des objets enlevés (barrés), dans `spots`. */
  crossed: number[];
  /** Constellation : disposition des faces d'un dé. */
  dice: boolean;
}

export interface CountGroup {
  object: DeckItem;
  count: number;
  field: Field;
}

export interface CountCard {
  kind: CountKind;
  level: Level;
  /** Question lue par le parent. */
  question: string;
  groups: CountGroup[];
  /** Réponse : un nombre (« 7 ») ou, pour comparer, le nom du groupe (« Les pommes »). */
  answer: string;
  /** Réponse en clair pour le parent (« 7 pommes »). */
  explain: string;
  /** Coup de pouce pour le parent. */
  hint: string;
}

/** Faces d'un dé, cases d'une grille de trois sur trois (dans l'ordre de lecture). */
const DICE: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Grille assez grande pour placer `count` objets au hasard, en gardant des trous. */
export function gridFor(count: number): { cols: number; rows: number } {
  if (count <= 6) return { cols: 4, rows: 3 };
  if (count <= 10) return { cols: 5, rows: 3 };
  return { cols: 6, rows: 5 };
}

const center = (cell: number, cols: number): Spot => ({
  x: (cell % cols) * CELL + CELL / 2,
  y: Math.floor(cell / cols) * CELL + CELL / 2,
});

/**
 * Place `count` objets : en constellation (dé) une fois sur deux jusqu'à 6, sinon au hasard,
 * chacun dans sa case, légèrement décalé pour ne pas faire une grille trop sage.
 */
export function layout(count: number, random: () => number = Math.random, dice = true): Field {
  if (dice && DICE[count] && random() < 0.5)
    return {
      cols: 3,
      rows: 3,
      spots: DICE[count].map((cell) => center(cell, 3)),
      crossed: [],
      dice: true,
    };
  const { cols, rows } = gridFor(count);
  const cells = shuffle(
    Array.from({ length: cols * rows }, (_, i) => i),
    random,
  )
    .slice(0, count)
    .sort((a, b) => a - b);
  const jitter = () => Math.round((random() * 2 - 1) * JITTER);
  const spots = cells.map((cell) => {
    const c = center(cell, cols);
    return { x: c.x + jitter(), y: c.y + jitter() };
  });
  return { cols, rows, spots, crossed: [], dice: false };
}

/** Entier entre `min` et `max`, bornes comprises. */
const between = (min: number, max: number, random: () => number) =>
  min + Math.floor(random() * (max - min + 1));

/** « pommes » d'après « Les pommes ». */
export function plural(object: DeckItem): string {
  return object.answer.replace(/^(?:les|des)\s+/i, '');
}

/** « pomme » : les noms du pack font leur pluriel en -s ou -x (vérifié par les tests). */
export function singular(object: DeckItem): string {
  return plural(object).replace(/[sx]$/, '');
}

/** « 1 pomme », « 3 pommes ». */
export function amount(count: number, object: DeckItem): string {
  return `${count} ${count > 1 ? plural(object) : singular(object)}`;
}

/** « de pommes », « d’étoiles ». */
function of(object: DeckItem): string {
  const noun = plural(object);
  return /^[aeiouyàâéèêëîïôûü]/i.test(noun) ? `d’${noun}` : `de ${noun}`;
}

/** Deux nombres différents entre `min` et `max`, écartés d'au moins `gap`. */
function twoCounts(min: number, max: number, gap: number, random: () => number): [number, number] {
  for (;;) {
    const a = between(min, max, random);
    const b = between(min, max, random);
    if (Math.abs(a - b) >= gap) return [a, b];
  }
}

const group = (object: DeckItem, count: number, random: () => number, dice = true) => ({
  object,
  count,
  field: layout(count, random, dice),
});

/**
 * Génère la manche d'un objet. Le niveau est celui de la carte (l'objet), ce qui suit les
 * niveaux de la partie et de chaque enfant comme dans les autres jeux. `others` : objets
 * où prendre le second groupe d'une comparaison.
 */
export function makeCard(
  object: DeckItem,
  random: () => number = Math.random,
  others: readonly DeckItem[] = COMPTE_OBJECTS,
): CountCard {
  const level = cardLevel(object) ?? 2;
  const max = MAX_COUNT[level];
  const kinds = KINDS[level];
  const pool = others.filter((o) => o.emoji !== object.emoji);
  let kind = kinds[Math.floor(random() * kinds.length)];
  if (kind === 'compare' && !pool.length) kind = 'count';
  const name = plural(object);

  if (kind === 'compare') {
    const other = pool[Math.floor(random() * pool.length)];
    // Deux groupes l'un sous l'autre : 10 objets au plus chacun, pour rester lisibles.
    const [a, b] = level === 1 ? twoCounts(1, 5, 2, random) : twoCounts(2, 10, 1, random);
    const groups = [group(object, a, random), group(other, b, random)];
    const more = a > b ? groups[0] : groups[1];
    const less = a > b ? groups[1] : groups[0];
    return {
      kind,
      level,
      question: 'Où y en a-t-il le plus ?',
      groups,
      answer: more.object.answer,
      explain: `${more.object.answer} : ${amount(more.count, more.object)}, contre ${amount(less.count, less.object)}.`,
      hint: 'Comptez chaque groupe, ou faites des paires du doigt : il en reste d’un côté.',
    };
  }

  if (kind === 'add') {
    // « 3 pommes et 2 pommes » : deux groupes de 10 au plus, 20 au total au plus.
    const a = between(1, 10, random);
    const b = between(1, Math.min(10, max - a), random);
    return {
      kind,
      level,
      question: `${amount(a, object)} et ${amount(b, object)}, ça fait combien ?`,
      groups: [group(object, a, random), group(object, b, random)],
      answer: String(a + b),
      explain: `${a} + ${b} = ${amount(a + b, object)}.`,
      hint: `Comptez toutes les ${name} ensemble, sans recommencer à 1 au second groupe.`,
    };
  }

  if (kind === 'sub') {
    // Les objets enlevés restent visibles, barrés : on compte ceux qui restent.
    const start = between(3, 15, random);
    const gone = between(1, start - 1, random);
    const g = group(object, start, random, false);
    g.field.crossed = shuffle(
      g.field.spots.map((_, i) => i),
      random,
    )
      .slice(0, gone)
      .sort((x, y) => x - y);
    return {
      kind,
      level,
      question: `Il y a ${amount(start, object)}, on en enlève ${gone}. Combien en reste-t-il ?`,
      groups: [g],
      answer: String(start - gone),
      explain: `${start} − ${gone} = ${amount(start - gone, object)}.`,
      hint: 'Ne comptez pas les objets barrés : seulement ceux qui restent.',
    };
  }

  // Compter : jusqu'à 5, 10 ou 20 selon le niveau (au moins quelques objets chez les grands).
  const min = level === 3 ? 8 : level === 2 ? 3 : 1;
  const count = between(min, max, random);
  return {
    kind,
    level,
    question: `Combien ${of(object)} ?`,
    groups: [group(object, count, random)],
    answer: String(count),
    explain: `${amount(count, object)}.`,
    hint: `Touchez chaque ${singular(object)} du doigt en comptant à voix haute.`,
  };
}

/** Nombres proches de la réponse pour « Répondre en montrant », tirés au hasard. */
export function nearNumbers(answer: number, random: () => number = Math.random): number[] {
  const near = [-3, -2, -1, 1, 2, 3].map((d) => answer + d).filter((n) => n >= 0);
  return shuffle(near, random).sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer));
}

/** Empreinte stable d'un texte (FNV-1a), pour un tirage reproductible. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Générateur pseudo-aléatoire graine (mulberry32) : le Défi du jour montre la même manche
 * toute la journée.
 */
export function seeded(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
