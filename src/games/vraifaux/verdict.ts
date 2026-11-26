import type { ChoiceOption } from '../choices/choices';

/**
 * Vrai ou faux rigolo (#56) : le parent lit une affirmation, l'enfant dit « vrai » ou « faux ».
 * Une carte de ce jeu est une carte « question » ordinaire dont la réponse commence par
 * « Vrai » ou « Faux », suivie d'une courte explication (« Faux ! Ils n'ont pas de pieds. »).
 * Toute carte de ce genre, même dans un jeu créé par le parent, se joue ainsi : pas d'indice
 * « Ça commence par… » (il trahirait la réponse) et, pour « Répondre en montrant », deux choix
 * Vrai / Faux au lieu des cartes voisines.
 */
export type Verdict = 'vrai' | 'faux';

/** « Vrai », « Faux ! … », « vrai : … » ; pas « Faux-filet » ni « Vraiment ». */
const VERDICT = /^(vrai|faux)(?=$|[\s!:.,;])/i;

/** Verdict d'une réponse, ou rien si ce n'est pas une carte vrai / faux. */
export function verdictOf(answer: string): Verdict | undefined {
  return VERDICT.exec(answer.trim())?.[1].toLowerCase() as Verdict | undefined;
}

/** Les deux choix, toujours dans le même ordre : pouce levé pour vrai, baissé pour faux. */
export const VERDICT_OPTIONS: readonly ChoiceOption[] = [
  { key: 'vrai', label: 'Vrai', emoji: '👍' },
  { key: 'faux', label: 'Faux', emoji: '👎' },
];

export function verdictOption(verdict: Verdict): ChoiceOption {
  return VERDICT_OPTIONS.find((o) => o.key === verdict)!;
}
