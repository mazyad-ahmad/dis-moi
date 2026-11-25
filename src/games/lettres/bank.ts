import { getPack } from '../../content/packs';

export interface GlyphCard {
  glyph: string;
  /** Consigne lue par le parent. */
  hint: string;
}

function glyphs(packId: string): GlyphCard[] {
  return getPack(packId).items.map((item) => ({ glyph: item.answer, hint: item.hint! }));
}

/** Lettres majuscules A-Z, chacune avec un mot d'exemple (`src/content/lettres.json`). */
export const LETTERS: GlyphCard[] = glyphs('lettres');

/** Chiffres 0-9, chacun avec une petite activité (`src/content/chiffres.json`). */
export const DIGITS: GlyphCard[] = glyphs('chiffres');
