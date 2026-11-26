import type { DeckItem } from '../deck/types';
import { shuffle } from '../shuffle';

/**
 * L'intrus (#63) : quatre images, une ne va pas avec les autres. L'enfant la montre du doigt
 * et dit pourquoi ; le parent valide. Cartes dans `src/content/catalogue-intrus.json` (jeu du
 * catalogue) : `others` les trois images qui vont ensemble, `emoji` l'intrus, `answer` son
 * nom, `text` la règle cachée (« Ce n’est pas un fruit. »), `hint` un coup de pouce.
 */
export const INTRUS_ID = 'intrus';

/** Places de la grille de deux sur deux, dans l'ordre de lecture, dites au parent. */
export const SPOTS = [
  'en haut à gauche',
  'en haut à droite',
  'en bas à gauche',
  'en bas à droite',
] as const;

export interface IntrusGrid {
  /** Les quatre images, dans l'ordre de la grille. */
  images: string[];
  /** Place de l'intrus dans `images`. */
  spot: number;
}

/** Grille d'une carte : l'intrus à une place tirée au hasard, les trois autres mélangées. */
export function intrusGrid(item: DeckItem, random: () => number = Math.random): IntrusGrid {
  const others = shuffle(item.others ?? [], random);
  const spot = Math.min(others.length, Math.floor(random() * (others.length + 1)));
  const images = [...others.slice(0, spot), item.emoji ?? '', ...others.slice(spot)];
  return { images, spot };
}
