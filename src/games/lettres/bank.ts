import { getPack } from '../../content/packs';
import type { Level } from '../levels';

/**
 * Familles de glyphes (#48) : majuscules, minuscules script, écriture attachée, chiffres,
 * nombres (10 à 20, puis dizaines) et constellations (points du dé, doigts de la main).
 */
export type GlyphSet = 'upper' | 'lower' | 'cursive' | 'digit' | 'number' | 'dice' | 'fingers';

export interface GlyphCard {
  /** Clé unique parmi toutes les familles (« upper:A », « dice:3 »…). */
  id: string;
  set: GlyphSet;
  /** Texte de la réponse : la lettre, le chiffre ou le nombre (aussi pour les constellations). */
  glyph: string;
  /** Consigne lue par le parent. */
  hint: string;
  /** Niveau par âge (#40). */
  level: Level;
}

function glyphs(packId: string, set: GlyphSet): GlyphCard[] {
  return getPack(packId).items.map((item) => ({
    id: `${set}:${item.answer}`,
    set,
    glyph: item.answer,
    hint: item.hint!,
    level: item.level,
  }));
}

/** Lettres majuscules A-Z, chacune avec un mot d'exemple (`src/content/lettres.json`). */
export const LETTERS: GlyphCard[] = glyphs('lettres', 'upper');

/** Chiffres 0-9, chacun avec une petite activité (`src/content/chiffres.json`). */
export const DIGITS: GlyphCard[] = glyphs('chiffres', 'digit');

/** Une marche de plus que la majuscule : les minuscules et l'attaché viennent après. */
const harder = (level: Level): Level => Math.min(3, level + 1) as Level;

/**
 * Minuscules et écriture attachée : les lettres de `lettres.json`, avec la même consigne,
 * précédée du nom de l'écriture.
 */
function fromLetters(set: 'lower' | 'cursive', intro: (glyph: string) => string): GlyphCard[] {
  return LETTERS.map((c) => {
    const glyph = c.glyph.toLocaleLowerCase('fr');
    return {
      id: `${set}:${glyph}`,
      set,
      glyph,
      hint: `${intro(glyph)} ${c.hint}`,
      level: harder(c.level),
    };
  });
}

export const LOWERCASE: GlyphCard[] = fromLetters(
  'lower',
  (g) => `C’est le « ${g} » des petites lettres.`,
);

export const CURSIVE: GlyphCard[] = fromLetters(
  'cursive',
  (g) => `Le « ${g} » attaché : tracez-le ensemble du doigt dans l’air.`,
);

/** Nombres de 10 à 20, puis les dizaines jusqu'à 100 (`src/content/nombres.json`). */
export const NUMBERS: GlyphCard[] = glyphs('nombres', 'number');

/** Constellations, à dénombrer d'un coup d'œil (`src/content/des.json`, `doigts.json`). */
export const DICE: GlyphCard[] = glyphs('des', 'dice');
export const FINGERS: GlyphCard[] = glyphs('doigts', 'fingers');
export const CONSTELLATIONS: GlyphCard[] = [...DICE, ...FINGERS];

const SETS: Record<GlyphSet, GlyphCard[]> = {
  upper: LETTERS,
  lower: LOWERCASE,
  cursive: CURSIVE,
  digit: DIGITS,
  number: NUMBERS,
  dice: DICE,
  fingers: FINGERS,
};

/** Toutes les familles, pour le « Mélange ». */
export const ALL_GLYPHS: GlyphCard[] = Object.values(SETS).flat();

/**
 * Famille d'un glyphe : les choix de « Répondre en montrant » y sont tirés (jamais un « a »
 * attaché à côté d'un « a » script, ni un dé à côté d'une main).
 */
export function glyphPool(card: GlyphCard): GlyphCard[] {
  return SETS[card.set];
}

/** Ce que le parent demande de montrer : « la lettre A », « le dé qui montre 3 »… */
export function glyphName(card: GlyphCard): string {
  const g = card.glyph;
  switch (card.set) {
    case 'upper':
      return `la lettre ${g}`;
    case 'lower':
      return `la lettre ${g} (minuscule)`;
    case 'cursive':
      return `la lettre ${g} (attachée)`;
    case 'digit':
      return `le chiffre ${g}`;
    case 'number':
      return `le nombre ${g}`;
    case 'dice':
      return `le dé qui montre ${g}`;
    case 'fingers':
      return `la main qui montre ${g}`;
  }
}

/** Nom court, annoncé par le lecteur d'écran : « Lettre A », « 3 points », « 3 doigts »… */
export function glyphLabel(card: GlyphCard): string {
  const g = card.glyph;
  const plural = Number(g) > 1 ? 's' : '';
  switch (card.set) {
    case 'upper':
    case 'lower':
      return `Lettre ${g}`;
    case 'cursive':
      return `Lettre ${g} attachée`;
    case 'digit':
      return `Chiffre ${g}`;
    case 'number':
      return `Nombre ${g}`;
    case 'dice':
      return `${g} point${plural}`;
    case 'fingers':
      return `${g} doigt${plural}`;
  }
}

/** Titre de la manche selon la famille. */
export function glyphTitle(set: GlyphSet): string {
  switch (set) {
    case 'digit':
      return 'Quel chiffre ?';
    case 'number':
      return 'Quel nombre ?';
    case 'dice':
    case 'fingers':
      return 'Combien ?';
    default:
      return 'Quelle lettre ?';
  }
}
