/**
 * Jacques a dit (#57) : le parent lit une consigne à faire avec le corps. Si elle commence par
 * « Jacques a dit », l'enfant la fait ; sinon c'est un piège, il ne bouge pas. Une étoile
 * quand l'enfant ne se fait pas piéger.
 * Une carte de ce jeu est une carte « question » ordinaire (`src/content/catalogue-jacques.json`)
 * marquée par son thème : `jacques-a-dit` ou `piege`. L'écran le dit tout de suite au parent,
 * sans réponse à dévoiler, pour enchaîner vite.
 */
export type Consigne = 'jacques-a-dit' | 'piege';

export const JACQUES_ID = 'jacques';

/** Sorte de consigne d'une carte, ou rien si ce n'est pas une carte « Jacques a dit ». */
export function consigneOf(item: { tags?: readonly string[] }): Consigne | undefined {
  if (item.tags?.includes('piege')) return 'piege';
  if (item.tags?.includes('jacques-a-dit')) return 'jacques-a-dit';
  return undefined;
}
