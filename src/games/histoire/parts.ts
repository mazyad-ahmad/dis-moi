/**
 * Histoire à inventer (#68) : chaque élément du pack `histoire.json` est un héros, un lieu ou
 * un objet, marqué dans ses `tags`. Données seules (lues aussi par la vérification des packs).
 */
export const STORY_PARTS = [
  { value: 'heros', name: 'Un héros' },
  { value: 'lieu', name: 'Un lieu' },
  { value: 'objet', name: 'Un objet' },
] as const;

export type StoryPart = (typeof STORY_PARTS)[number]['value'];

/** Rôle d'un élément : le seul de ses `tags` qui en est un (sinon rien). */
export function storyPart(tags: readonly string[] | undefined): StoryPart | undefined {
  const parts = STORY_PARTS.filter((p) => tags?.includes(p.value));
  return parts.length === 1 ? parts[0].value : undefined;
}
