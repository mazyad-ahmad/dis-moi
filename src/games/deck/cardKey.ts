import type { DeckItem } from './types';

/**
 * Clé d'une carte dans le tirage sauvegardé. Les cartes créées n'ont pas d'identifiant :
 * position et réponse, pour qu'un jeu modifié entre-temps donne une nouvelle partie.
 */
export function cardKey(item: DeckItem, index: number) {
  return item.id ?? `${index}:${item.answer}`;
}
