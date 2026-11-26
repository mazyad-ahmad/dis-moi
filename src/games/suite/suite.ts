import { deckItems, getPack } from '../../content/packs';
import type { DeckItem } from '../deck/types';
import { cardLevel, type Level } from '../levels';
import { shuffle } from '../shuffle';

/**
 * La suite logique (#129) : une suite d'images avec une case vide à la fin, l'enfant dit ou
 * montre ce qui vient ensuite. Les cartes du pack (`src/content/catalogue-suite.json`) ne
 * sont que des images (`emoji`, `answer` : « une pomme ») rangées en familles (`tags` :
 * fruits, formes…) ; chaque manche est **générée** d'après le niveau de l'image tirée :
 * motif, images de la même famille, longueur. Jamais à court de cartes.
 */
export const SUITE_ID = 'suite';

/** Images du jeu (cartes du pack). */
export const SUITE_ITEMS: DeckItem[] = deckItems(getPack(SUITE_ID));

/**
 * Motifs par niveau : Petits AB ; Moyens ABC, AAB, ABB ; Grands, des suites qui grandissent
 * (une image de plus à chaque case) ou deux règles à la fois (les images alternent et le
 * nombre grandit).
 */
export const MOTIFS: Record<Level, string[]> = {
  1: ['AB'],
  2: ['ABC', 'AAB', 'ABB'],
  3: ['grow', 'grow2'],
};

/** Une case de la suite : une image, montrée `count` fois. */
export interface Cell {
  item: DeckItem;
  count: number;
}

export interface SuiteCard {
  level: Level;
  /** Motif répété (« AB », « AAB »…), ou suite qui grandit (`grow`, `grow2`). */
  motif: string;
  /** Cases montrées avant la case vide. */
  cells: Cell[];
  /** Ce qui va dans la case vide. */
  answer: Cell;
  /** Images de la même famille, pour les choix à montrer. */
  family: DeckItem[];
  /** La règle en clair pour le parent. */
  explain: string;
  /** Coup de pouce pour le parent. */
  hint: string;
}

/** Plus grand nombre d'images dans une case (la réponse comprise), pour rester lisible. */
export const MAX_COUNT = 5;

/** Famille d'une image : son premier thème. */
export const familyOf = (item: DeckItem) => item.tags?.[0] ?? '';

/** « pommes », « carrés bleus » : chaque mot prend un s, sauf s'il finit déjà par s, x ou z. */
export function plural(item: DeckItem): string {
  return item.answer
    .split(' ')
    .slice(1)
    .map((word) => (/[sxz]$/.test(word) ? word : `${word}s`))
    .join(' ');
}

/** « une pomme », « 4 pommes ». */
export function cellName({ item, count }: Cell): string {
  return count > 1 ? `${count} ${plural(item)}` : item.answer;
}

/** Ce qu'on voit dans la case : l'emoji, répété. */
export const cellEmoji = ({ item, count }: Cell) => (item.emoji ?? '').repeat(count);

/** Clé d'une case, unique parmi les choix. */
export const cellKey = ({ item, count }: Cell) => `${item.id ?? item.answer}-${count}`;

/**
 * Génère la manche d'une image. Le niveau est celui de la carte, ce qui suit les niveaux de
 * la partie et de chaque enfant comme dans les autres jeux. `items` : où prendre les autres
 * images, toujours de la même famille (des formes avec des formes).
 */
export function makeSuite(
  item: DeckItem,
  random: () => number = Math.random,
  items: readonly DeckItem[] = SUITE_ITEMS,
): SuiteCard {
  const level = cardLevel(item) ?? 2;
  const family = items.filter((i) => familyOf(i) === familyOf(item) && i.emoji !== item.emoji);
  const others = shuffle(family, random);
  const motifs = MOTIFS[level];
  let motif = motifs[Math.floor(random() * motifs.length)];
  const letters = new Set(motif.startsWith('grow') ? (motif === 'grow' ? 'A' : 'AB') : motif);
  // Pas assez d'images dans la famille : un motif plus simple.
  if (letters.size > others.length + 1) motif = 'AB';
  const tokens = [item, ...others];
  const at = (letter: string) => tokens['ABC'.indexOf(letter)] ?? item;
  const sameFamily = items.filter((i) => familyOf(i) === familyOf(item));

  if (motif === 'grow') {
    // 1, 2, 3… : la règle « une de plus » se voit deux fois avant la case vide.
    const cells = [1, 2, 3].map((count) => ({ item, count }));
    const answer = { item, count: 4 };
    return {
      level,
      motif,
      cells,
      answer,
      family: sameFamily,
      explain: `${cellName(answer)} : une image de plus à chaque case (1, 2, 3, 4).`,
      hint: 'Comptez les images de chaque case à voix haute : 1, 2, 3… et ensuite ?',
    };
  }

  if (motif === 'grow2') {
    // Deux règles à la fois : les images alternent (A, B) et leur nombre grandit (1, 2, 3, 4).
    const b = at('B');
    const cells = [1, 2, 3, 4].map((count) => ({ item: count % 2 ? item : b, count }));
    const answer = { item, count: 5 };
    return {
      level,
      motif,
      cells,
      answer,
      family: sameFamily,
      explain: `${cellName(answer)} : ${plural(item)} et ${plural(b)} chacun leur tour, et une image de plus à chaque case.`,
      hint: 'Deux choses changent : regardez d’abord quelle image revient, puis combien il y en a.',
    };
  }

  // Motif répété : au moins deux fois en entier, puis parfois un bout du motif.
  const reps = motif.length === 2 && random() < 0.5 ? 3 : 2;
  const extra = Math.floor(random() * motif.length);
  const pattern = motif.repeat(reps) + motif.slice(0, extra);
  const cells = [...pattern].map((letter) => ({ item: at(letter), count: 1 }));
  const answer = { item: at(motif[extra]), count: 1 };
  const spoken = [...motif].map((letter) => at(letter).answer.split(' ').slice(1).join(' '));
  const shownMotif = [...motif].map((letter) => at(letter).emoji).join(' ');
  return {
    level,
    motif,
    cells,
    answer,
    family: sameFamily,
    explain: `${answer.item.emoji} ${answer.item.answer} : le motif ${shownMotif} se répète.`,
    hint: `Dites la suite à voix haute ensemble : ${[...spoken, ...spoken].join(', ')}…`,
  };
}

/**
 * Choix pour « Répondre en montrant » (#123), la réponse comprise, dans le désordre :
 * motif répété, les images de la famille (celles du motif d'abord) ; suite qui grandit, la
 * même image en plus ou moins grand nombre ; deux règles, l'autre image ou un autre nombre.
 */
export function suiteChoices(
  card: SuiteCard,
  count: number,
  random: () => number = Math.random,
): Cell[] {
  const { answer } = card;
  let others: Cell[];
  if (card.motif === 'grow')
    others = [answer.count - 1, answer.count + 1, answer.count - 2].map((n) => ({
      item: answer.item,
      count: n,
    }));
  else if (card.motif === 'grow2') {
    const other = card.cells.find((c) => c.item !== answer.item)?.item ?? answer.item;
    others = [
      { item: other, count: answer.count },
      { item: answer.item, count: answer.count - 1 },
      { item: other, count: answer.count - 1 },
    ];
  } else {
    const inMotif = [...new Set(card.cells.map((c) => c.item))];
    const rest = card.family.filter((i) => !inMotif.includes(i));
    others = [...shuffle(inMotif, random), ...shuffle(rest, random)].map((item) => ({
      item,
      count: 1,
    }));
  }
  const seen = new Set([cellKey(answer)]);
  const picked = others.filter((c) => !seen.has(cellKey(c)) && (seen.add(cellKey(c)), true));
  const shown = [answer, ...picked.slice(0, Math.max(0, count - 1))];
  return card.motif.startsWith('grow')
    ? shown.sort((a, b) => a.count - b.count || (a.item === answer.item ? -1 : 1))
    : shuffle(shown, random);
}
