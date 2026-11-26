import { getPack } from '../../content/packs';
import type { Level } from '../levels';

/** Mots faciles à dessiner pour les 3-7 ans (`src/content/dessin.json`). */
export const DRAW_WORDS: string[] = getPack('dessin').items.map((item) => item.answer);

/** Niveau par âge de chaque mot (#40). */
export const DRAW_LEVELS: ReadonlyMap<string, Level> = new Map(
  getPack('dessin').items.map((item) => [item.answer, item.level]),
);
