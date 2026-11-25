import { getPack } from '../../content/packs';

/** Mots faciles à dessiner pour les 3-7 ans (`src/content/dessin.json`). */
export const DRAW_WORDS: string[] = getPack('dessin').items.map((item) => item.answer);
