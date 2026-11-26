import { getPack, type PackItem } from '../../content/packs';
import { storyPart, type StoryPart } from './parts';

/**
 * Histoire à inventer (#68) : chaque manche tire un héros, un lieu et un objet (emoji et
 * mots) ; l'enfant invente l'histoire, le parent la relance. Sans bonne réponse, comme
 * Raconte-moi : « Merci pour ton histoire » donne l'étoile, gagnée ensemble, et « Passer »
 * change d'images sans rien dire. Le parent peut enregistrer l'histoire, d'un geste, dans le
 * Livre d'histoires : elle reste sur le téléphone.
 */
export const HISTOIRE_ID = 'histoire';
export const HISTOIRE_NAME = 'Histoire à inventer';
export const HISTOIRE_CATEGORY = 'Inventer';
export const THANKS_LABEL = 'Merci pour ton histoire';
/** Une histoire prend du temps : 5 manches au plus, même si le réglage en prévoit plus. */
export const MAX_STORY_ROUNDS = 5;

/** Éléments du pack, par rôle (le mot, avec son article, est dans `answer`). */
const ITEMS: readonly PackItem[] = getPack(HISTOIRE_ID).items;
const partOf = (part: StoryPart) => ITEMS.filter((i) => storyPart(i.tags) === part);
export const HEROES: readonly PackItem[] = partOf('heros');
export const PLACES: readonly PackItem[] = partOf('lieu');
export const OBJECTS: readonly PackItem[] = partOf('objet');

/** Relances du parent, pour aider l'enfant à continuer, sans jamais le corriger. */
export const STORY_PROMPTS = [
  'Et après ?',
  'Qui arrive ?',
  'Qu’est-ce qu’il trouve ?',
  'Où vont-ils maintenant ?',
  'Et là, qu’est-ce qui se passe de rigolo ?',
  'Comment ça se termine ?',
] as const;

/** La phrase de départ que le parent lit : « Il était une fois un dragon, au zoo, avec une clé… » */
export function storyStart(hero: PackItem, place: PackItem, object: PackItem): string {
  return `Il était une fois ${hero.answer}, ${place.answer}, avec ${object.answer}…`;
}

/** Première lettre en majuscule (« un dragon » → « Un dragon »). */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Titre d'une histoire du livre : ses trois images en mots (« Un dragon, au zoo, une clé »). */
export function storyTitle(parts: readonly { answer: string }[]): string {
  return capitalize(parts.map((p) => p.answer).join(', '));
}

/** Fin de partie sans étoile (tout passé) : un mot doux, jamais « pas d'étoile ». */
export const NO_STAR_MESSAGE = 'Merci pour ce moment ensemble. On inventera d’autres histoires !';
