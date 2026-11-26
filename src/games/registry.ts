import { getPack } from '../content/packs';
import { levelsOf, type Activity } from './activities';
import type { Level } from './levels';
import { needsOf, type PlayNeeds } from './modes';

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
  /** Ce que le jeu demande à l'enfant (#42) : regarder l'écran, bouger. Voir `modes.ts`. */
  needs?: PlayNeeds;
  /** Trouver le bon jeu (#137) : types (le premier range le jeu), voir `activities.ts`. */
  activities?: Activity[];
  /** Tranche d'âge : niveaux des cartes du jeu ; absente : tous les âges. */
  levels?: Level[];
  /** Ce que le jeu fait travailler, en une phrase (« prépare à la lecture »). */
  skill?: string;
}

const packLevels = (...ids: string[]): Level[] => levelsOf(ids.flatMap((id) => getPack(id).items));

/** Jeux de base, dans l'ordre de l'accueil (maquette Main). */
export const GAMES: GameInfo[] = [
  {
    id: 'chanson',
    name: 'Quelle chanson ?',
    category: 'Musique',
    tint: 'meadow',
    icon: 'music',
    needs: needsOf('melody'),
    activities: ['ecouter'],
    levels: packLevels('chansons'),
    skill: 'Exerce l’oreille et la mémoire',
  },
  {
    id: 'lettres',
    name: 'Quelle lettre ?',
    category: 'Lettres et chiffres',
    tint: 'sky',
    icon: 'letters',
    needs: needsOf('glyph'),
    activities: ['lire-compter'],
    levels: packLevels('lettres', 'chiffres', 'nombres', 'des', 'doigts'),
    skill: 'Prépare à la lecture et au calcul',
  },
  {
    id: 'dessin',
    name: 'Dessine ça',
    category: 'Dessin',
    tint: 'dawn',
    icon: 'pencil',
    needs: needsOf('draw'),
    activities: ['dessiner'],
    levels: packLevels('dessin'),
    skill: 'Fait travailler la main et l’imagination',
  },
];

export function findGame(id: string): GameInfo | undefined {
  return GAMES.find((g) => g.id === id);
}
