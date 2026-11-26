import type { DeckItem } from '../deck/types';
import type { GameMode } from '../modes';

/**
 * Que fais-tu si… ? (#133) : le parent lit une petite situation du quotidien, l'enfant dit ce
 * qu'il ferait. Pas de bonne ou de mauvaise réponse : la zone du parent propose des pistes
 * (`hint`, puis `hints`) et une question pour en parler (`talk`) ; « On en a parlé » donne
 * l'étoile, gagnée ensemble. Pack `src/content/catalogue-situation.json`.
 */
export const SITUATION_ID = 'situation';
export const SITUATION_QUESTION = 'Que fais-tu ?';
export const THANKS_LABEL = 'On en a parlé';
export const PARENT_LINE =
  'Pas de bonne ou de mauvaise réponse : écoute son idée, puis cherchez-en d’autres ensemble.';
export const IDEAS_LABEL = 'Voir des pistes';
/** Fin de partie sans étoile (tout passé) : un mot doux, jamais « pas d'étoile ». */
export const NO_STAR_MESSAGE = 'Merci pour ce moment ensemble. On en reparlera une autre fois !';

/**
 * Thème des situations qui demandent d'être rassuré (« perdu au magasin ») : réservées aux
 * Grands, toujours avec une issue rassurante, et jamais jouées au coucher.
 */
export const REASSURE_TAG = 'rassurer';

/** Pistes de réponse d'une situation, dans l'ordre. */
export function ideasOf(item: DeckItem): string[] {
  return [item.hint, ...(item.hints ?? [])].filter((h): h is string => !!h);
}

/** Texte lu à voix haute : la situation, puis la question. */
export function situationSpeech(item: DeckItem): string {
  return `${item.text} ${SITUATION_QUESTION}`;
}

/** Situations jouables dans ce mode : au coucher, rien qui demande d'être rassuré. */
export function situationsFor<T extends DeckItem>(items: readonly T[], mode: GameMode): T[] {
  return mode === 'coucher' ? items.filter((i) => !i.tags?.includes(REASSURE_TAG)) : [...items];
}
