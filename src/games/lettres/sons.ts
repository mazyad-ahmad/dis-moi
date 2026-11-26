import type { GlyphCard } from './bank';

/**
 * Le son des lettres (#50) : en maternelle, on travaille le son de la lettre avant son nom.
 * Pour chaque lettre, le son écrit pour le parent, trois mots illustrés qui commencent par ce
 * son et un intrus, qui commence par un son bien différent (jamais un piège : pas de « ch »
 * pour le S, pas de « f » pour le V). Emoji dessinés par la police du téléphone, aucun fichier.
 */

export interface SoundWord {
  word: string;
  emoji: string;
}

export interface LetterSound {
  /** La lettre, en majuscule. */
  letter: string;
  /** Le son, écrit pour le parent : « mmm », « k »… */
  sound: string;
  /** Trois mots qui commencent par ce son. */
  words: readonly [SoundWord, SoundWord, SoundWord];
  /** Un mot qui commence autrement, pour « Qu'est-ce qui commence comme… ? ». */
  intrus?: SoundWord;
  /** Précision pour le parent, après le son. */
  note?: string;
  /** Le H ne se prononce pas : pas de son à faire entendre ni à comparer. */
  silent?: boolean;
}

const w = (word: string, emoji: string): SoundWord => ({ word, emoji });

// Une lettre par ligne, comme dans les packs.
// prettier-ignore
export const LETTER_SOUNDS: readonly LetterSound[] = [
  { letter: 'A', sound: 'a', words: [w('avion', '✈️'), w('ananas', '🍍'), w('arbre', '🌳')], intrus: w('poisson', '🐟') },
  { letter: 'B', sound: 'b', words: [w('ballon', '🎈'), w('banane', '🍌'), w('bateau', '⛵')], intrus: w('chat', '🐱') },
  { letter: 'C', sound: 'k', words: [w('canard', '🦆'), w('cadeau', '🎁'), w('carotte', '🥕')], intrus: w('soleil', '☀️') },
  { letter: 'D', sound: 'd', words: [w('dauphin', '🐬'), w('dinosaure', '🦕'), w('dent', '🦷')], intrus: w('lune', '🌙') },
  { letter: 'E', sound: 'é', words: [w('éléphant', '🐘'), w('étoile', '⭐'), w('école', '🏫')], intrus: w('vélo', '🚲') },
  { letter: 'F', sound: 'fff', words: [w('fraise', '🍓'), w('fusée', '🚀'), w('fleur', '🌸')], intrus: w('tortue', '🐢') },
  { letter: 'G', sound: 'g', words: [w('gâteau', '🍰'), w('gorille', '🦍'), w('guitare', '🎸')], intrus: w('maison', '🏠') },
  { letter: 'H', sound: 'h', words: [w('hibou', '🦉'), w('hérisson', '🦔'), w('hamster', '🐹')], silent: true, note: 'Le H ne s’entend pas : dans hibou, on entend d’abord « i ».' },
  { letter: 'I', sound: 'i', words: [w('igloo', '🧊'), w('île', '🏝️'), w('iguane', '🦎')], intrus: w('banane', '🍌') },
  { letter: 'J', sound: 'jjj', words: [w('jus', '🧃'), w('jupe', '👗'), w('jongleur', '🤹')], intrus: w('lion', '🦁') },
  { letter: 'K', sound: 'k', words: [w('koala', '🐨'), w('kangourou', '🦘'), w('kiwi', '🥝')], intrus: w('lapin', '🐰') },
  { letter: 'L', sound: 'lll', words: [w('lapin', '🐰'), w('lune', '🌙'), w('lion', '🦁')], intrus: w('canard', '🦆') },
  { letter: 'M', sound: 'mmm', words: [w('maison', '🏠'), w('moto', '🏍️'), w('mouton', '🐑')], intrus: w('fraise', '🍓') },
  { letter: 'N', sound: 'nnn', words: [w('nuage', '☁️'), w('nez', '👃'), w('nœud', '🎀')], intrus: w('ballon', '🎈') },
  { letter: 'O', sound: 'o', words: [w('orange', '🍊'), w('olive', '🫒'), w('oreille', '👂')], intrus: w('serpent', '🐍') },
  { letter: 'P', sound: 'p', words: [w('pomme', '🍎'), w('poisson', '🐟'), w('papillon', '🦋')], intrus: w('vache', '🐄') },
  { letter: 'Q', sound: 'k', words: [w('quatre', '4️⃣'), w('quille', '🎳'), w('quiche', '🥧')], intrus: w('fleur', '🌸') },
  { letter: 'R', sound: 'rrr', words: [w('renard', '🦊'), w('robot', '🤖'), w('rose', '🌹')], intrus: w('sapin', '🌲') },
  { letter: 'S', sound: 'sss', words: [w('soleil', '☀️'), w('serpent', '🐍'), w('sapin', '🌲')], intrus: w('cadeau', '🎁') },
  { letter: 'T', sound: 't', words: [w('tortue', '🐢'), w('tomate', '🍅'), w('train', '🚂')], intrus: w('mouton', '🐑') },
  { letter: 'U', sound: 'u', words: [w('usine', '🏭'), w('ukulélé', '🪕'), w('univers', '🌌')], intrus: w('renard', '🦊') },
  { letter: 'V', sound: 'vvv', words: [w('vélo', '🚲'), w('vache', '🐄'), w('volcan', '🌋')], intrus: w('gâteau', '🍰') },
  { letter: 'W', sound: 'ou', words: [w('wapiti', '🦌'), w('wok', '🥘'), w('wifi', '📶')], intrus: w('tomate', '🍅') },
  { letter: 'X', sound: 'ks', note: 'ou « gz » (Xavier)', words: [w('xylophone', '🎶'), w('xérus', '🐿️'), w('Xavier', '👦')], intrus: w('fusée', '🚀') },
  { letter: 'Y', sound: 'ye', words: [w('yaourt', '🥣'), w('yoyo', '🪀'), w('yak', '🐃')], intrus: w('guitare', '🎸') },
  { letter: 'Z', sound: 'zzz', words: [w('zèbre', '🦓'), w('zéro', '0️⃣'), w('zoo', '🦒')], intrus: w('train', '🚂') },
];

const BY_LETTER = new Map(LETTER_SOUNDS.map((s) => [s.letter, s]));

/** Son d'une carte de lettre (majuscule, minuscule ou attachée), sinon rien. */
export function letterSoundOf(card: GlyphCard): LetterSound | undefined {
  if (card.set !== 'upper' && card.set !== 'lower' && card.set !== 'cursive') return undefined;
  return BY_LETTER.get(card.glyph.toLocaleUpperCase('fr'));
}

/** Les deux questions proposées au parent. */
export type SoundQuestion = 'find' | 'like';

/** « Qu'est-ce qui commence comme maison ? » demande un intrus et un son qu'on entend. */
export function soundQuestions(s: LetterSound): SoundQuestion[] {
  return s.silent || !s.intrus ? ['find'] : ['find', 'like'];
}

/** Ce que la voix du téléphone dit : les trois mots, l'un après l'autre. */
export function spokenWords(s: LetterSound): string {
  return s.words.map((x) => x.word).join('… ');
}
