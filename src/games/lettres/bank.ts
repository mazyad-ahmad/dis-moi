import { getPack } from '../../content/packs';
import type { Level } from '../levels';

export interface GlyphCard {
  glyph: string;
  /** Consigne lue par le parent. */
  hint: string;
  /** Niveau par âge (#40). */
  level: Level;
}

function glyphs(packId: string): GlyphCard[] {
  return getPack(packId).items.map((item) => ({
    glyph: item.answer,
    hint: item.hint!,
    level: item.level,
  }));
}

/** Lettres majuscules A-Z, chacune avec un mot d'exemple (`src/content/lettres.json`). */
export const LETTERS: GlyphCard[] = glyphs('lettres');

/** Chiffres 0-9, chacun avec une petite activité (`src/content/chiffres.json`). */
export const DIGITS: GlyphCard[] = glyphs('chiffres');

/** Paquet d'un glyphe (lettres ou chiffres) : les choix de « Répondre en montrant » y sont tirés. */
export function glyphPool(card: GlyphCard): GlyphCard[] {
  return /^\d$/.test(card.glyph) ? DIGITS : LETTERS;
}
