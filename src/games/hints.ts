/**
 * Indices en escalier (#34) : quand l'enfant sèche, le parent donne un indice de plus,
 * jamais la réponse directement. D'abord les indices écrits de la carte, puis la première
 * lettre, tirée de la réponse. La réponse reste derrière « Voir la réponse ».
 */

/** Articles qu'on saute pour trouver le mot à deviner : « La vache » → « vache ». */
const ARTICLE = /^(?:(?:le|la|les|un|une|des|du)\s+|l['’]\s*)/i;

/** Première lettre (ou premier chiffre) du mot à deviner, en majuscule. */
export function firstLetter(answer: string): string | undefined {
  const word = answer.trim().replace(ARTICLE, '');
  const letter = /[\p{L}\p{N}]/u.exec(word)?.[0] ?? /[\p{L}\p{N}]/u.exec(answer)?.[0];
  return letter?.toLocaleUpperCase('fr');
}

/** Indice généré : « Ça commence par « V » ». */
export function firstLetterHint(answer: string): string | undefined {
  const letter = firstLetter(answer);
  return letter && `Ça commence par « ${letter} »`;
}

/** Indices écrits d'une carte, dans l'ordre et sans doublon. */
export function writtenHints(card: { hint?: string; hints?: string[] }): string[] {
  const all = [card.hint, ...(card.hints ?? [])].filter((h): h is string => !!h?.trim());
  return [...new Set(all)];
}

/**
 * Échelle d'indices d'une carte : indices écrits, puis première lettre.
 * Toute carte a au moins l'indice « première lettre » (sauf réponse sans lettre).
 */
export function hintLadder(card: { answer: string; hint?: string; hints?: string[] }): string[] {
  const letter = firstLetterHint(card.answer);
  return [...writtenHints(card), ...(letter ? [letter] : [])];
}
