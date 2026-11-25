export interface GlyphCard {
  glyph: string;
  /** Consigne lue par le parent. */
  hint: string;
}

const WORDS: Record<string, string> = {
  A: 'avion',
  B: 'ballon',
  C: 'cheval',
  D: 'dauphin',
  E: 'éléphant',
  F: 'fraise',
  G: 'gâteau',
  H: 'hibou',
  I: 'igloo',
  J: 'jardin',
  K: 'koala',
  L: 'lapin',
  M: 'maison',
  N: 'nuage',
  O: 'orange',
  P: 'pomme',
  Q: 'quatre',
  R: 'renard',
  S: 'soleil',
  T: 'tortue',
  U: 'usine',
  V: 'vélo',
  W: 'wagon',
  X: 'xylophone',
  Y: 'yaourt',
  Z: 'zèbre',
};

/** Lettres majuscules A-Z, chacune avec un mot d'exemple. */
export const LETTERS: GlyphCard[] = Object.entries(WORDS).map(([glyph, word]) => ({
  glyph,
  hint: `Un mot qui commence par ${glyph} : ${word}`,
}));

/** Chiffres 0-9, chacun avec une petite activité. */
export const DIGITS: GlyphCard[] = [
  { glyph: '0', hint: 'Demande combien de doigts on lève avec le poing fermé' },
  { glyph: '1', hint: 'Demande de sauter 1 fois sur place' },
  { glyph: '2', hint: 'Demande combien d’yeux on a' },
  { glyph: '3', hint: 'Demande de montrer 3 doigts' },
  { glyph: '4', hint: 'Demande combien de pattes a un chat' },
  { glyph: '5', hint: 'Demande de taper 5 fois dans les mains' },
  { glyph: '6', hint: 'Demande quel chiffre vient juste après 5' },
  { glyph: '7', hint: 'Demande de compter jusqu’à 7' },
  { glyph: '8', hint: 'Demande combien de pattes a une araignée' },
  { glyph: '9', hint: 'Demande quel nombre vient juste après 9 (10)' },
];
