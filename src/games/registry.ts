export type Tint = 'meadow' | 'sky' | 'dawn';
export type GameIcon = 'music' | 'letters' | 'pencil';

export interface GameInfo {
  id: string;
  name: string;
  category: string;
  tint: Tint;
  /** Icône des jeux de base, sinon une marque de 1 à 3 caractères. */
  icon?: GameIcon;
  mark?: string;
}

/** Jeux de base, dans l'ordre de l'accueil (maquette Main). */
export const GAMES: GameInfo[] = [
  {
    id: 'chanson',
    name: 'Quelle chanson ?',
    category: 'Musique',
    tint: 'meadow',
    icon: 'music',
  },
  {
    id: 'lettres',
    name: 'Quelle lettre ?',
    category: 'Lettres et chiffres',
    tint: 'sky',
    icon: 'letters',
  },
  { id: 'dessin', name: 'Dessine ça', category: 'Dessin', tint: 'dawn', icon: 'pencil' },
];

export function findGame(id: string): GameInfo | undefined {
  return GAMES.find((g) => g.id === id);
}
