export type Tint = 'meadow' | 'sky' | 'dawn';
export type GameIcon = 'music' | 'letters' | 'pencil';

export interface GameInfo {
  id: string;
  name: string;
  category: string;
  tint: Tint;
  icon: GameIcon;
  /** Issue GitHub qui livre le jeu. */
  issue: number;
}

/** Jeux de base, dans l'ordre de l'accueil (maquette Main). */
export const GAMES: GameInfo[] = [
  {
    id: 'chanson',
    name: 'Quelle chanson ?',
    category: 'Musique',
    tint: 'meadow',
    icon: 'music',
    issue: 6,
  },
  {
    id: 'lettres',
    name: 'Quelle lettre ?',
    category: 'Lettres et chiffres',
    tint: 'sky',
    icon: 'letters',
    issue: 7,
  },
  { id: 'dessin', name: 'Dessine ça', category: 'Dessin', tint: 'dawn', icon: 'pencil', issue: 8 },
];

export function findGame(id: string): GameInfo | undefined {
  return GAMES.find((g) => g.id === id);
}
