/**
 * Thèmes de « Raconte-moi » (#125) : chaque question du pack `raconte.json` en porte un,
 * dans ses `tags`. Données seules (lues aussi par la vérification des packs).
 */
export const CHAT_THEMES = [
  { value: 'journee', name: 'Ma journée' },
  { value: 'imaginer', name: 'Imaginer' },
  { value: 'famille', name: 'Ma famille et mes amis' },
  { value: 'gouts', name: 'Mes goûts' },
] as const;

export type ChatTheme = (typeof CHAT_THEMES)[number]['value'];

/** Thème d'une question (le premier de ses `tags` qui en est un). */
export function chatTheme(tags: readonly string[] | undefined) {
  return CHAT_THEMES.find((t) => tags?.includes(t.value));
}
