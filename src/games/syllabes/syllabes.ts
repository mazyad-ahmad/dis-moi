import type { ChoiceOption } from '../choices/choices';

/**
 * Tape les syllabes (#127) : le parent dit un mot, l'enfant tape dans ses mains une fois par
 * syllabe (« cho-co-lat » = 3) ; en Voiture, il compte à voix haute, sans taper.
 * Une carte de ce jeu est une carte « question » ordinaire (`src/content/catalogue-syllabes.json`)
 * de thème `syllabes` : le texte est le mot, la réponse le mot découpé comme on le dit
 * (« gi-rafe » : le « e » de la fin ne se dit pas). Variante des grands, thème `trouve` en plus :
 * « Trouve un mot qui a 3 syllabes », la réponse donne quelques exemples séparés par des virgules.
 * L'écran montre d'emblée au parent le découpage et le nombre de syllabes, sans rien à dévoiler.
 */
export const SYLLABES_ID = 'syllabes';

/** Nombre de syllabes d'un mot du jeu. */
export const MIN_SYLLABES = 1;
export const MAX_SYLLABES = 4;

export type Syllabes =
  | { kind: 'mot'; parts: string[]; count: number }
  | { kind: 'trouve'; examples: string[]; count: number };

const WANTED = /(\d+) syllabes?/;

/** Le mot découpé, ou le mot à trouver ; rien si ce n'est pas une carte « Tape les syllabes ». */
export function syllabesOf(item: {
  answer: string;
  text?: string;
  tags?: readonly string[];
}): Syllabes | undefined {
  if (!item.tags?.includes('syllabes')) return undefined;
  if (item.tags.includes('trouve')) {
    const count = Number(WANTED.exec(item.text ?? '')?.[1]);
    if (!count) return undefined;
    return { kind: 'trouve', examples: item.answer.split(', '), count };
  }
  const parts = item.answer.split('-');
  return { kind: 'mot', parts, count: parts.length };
}

export const syllabesLabel = (count: number) => `${count} syllabe${count > 1 ? 's' : ''}`;

/** « Répondre en montrant » : les nombres de syllabes, en grand. */
export const SYLLABES_OPTIONS: readonly ChoiceOption[] = Array.from(
  { length: MAX_SYLLABES - MIN_SYLLABES + 1 },
  (_, i) => syllabesOption(MIN_SYLLABES + i),
);

export function syllabesOption(count: number): ChoiceOption {
  return { key: String(count), label: syllabesLabel(count), glyph: String(count) };
}

/** Choix tirés, remis dans l'ordre des nombres (1, 2, 3, 4) pour compter sans chercher. */
export function inCountOrder(options: readonly ChoiceOption[]): ChoiceOption[] {
  return [...options].sort((a, b) => Number(a.key) - Number(b.key));
}
