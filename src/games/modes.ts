import type { PackKind } from '../content/packs';

/**
 * Façons de jouer (#42) : choisies sur l'accueil au lancement, Normal par défaut.
 * - Express : 3 manches.
 * - Coucher : thème nuit, sons doux, pas de minuteur, jeux calmes seulement, fin en douceur.
 * - Voiture : seulement des cartes orales, rien à regarder ni à dessiner.
 * Ce module ne contient que des données et des fonctions pures, réutilisables par
 * d'autres raccourcis (#137) : « ce jeu convient-il à ce mode ? » = `suitsMode`.
 */
export type GameMode = 'normal' | 'express' | 'coucher' | 'voiture';

export interface ModeInfo {
  value: GameMode;
  /** Nom court montré au parent. */
  name: string;
  /** Ce que le mode change, en clair. */
  desc: string;
}

export const GAME_MODES: readonly ModeInfo[] = [
  { value: 'normal', name: 'Normal', desc: 'Toutes les manches, tous les jeux.' },
  { value: 'express', name: 'Express', desc: '3 manches, pour jouer vite.' },
  {
    value: 'coucher',
    name: 'Coucher',
    desc: 'Thème nuit, sons doux, sans minuteur, jeux calmes.',
  },
  { value: 'voiture', name: 'Voiture', desc: 'Tout à l’oral, rien à regarder.' },
];

export const DEFAULT_MODE: GameMode = 'normal';
/** Nombre de manches d'une partie Express. */
export const EXPRESS_ROUNDS = 3;

export function isGameMode(value: unknown): value is GameMode {
  return GAME_MODES.some((m) => m.value === value);
}

export function modeInfo(mode: GameMode): ModeInfo {
  return GAME_MODES.find((m) => m.value === mode)!;
}

/**
 * Ce qu'un jeu (ou une carte) demande à l'enfant, déclaré avec le jeu.
 * Un jeu qui ne déclare rien est jugé prudemment : il ne va pas en Coucher ni en Voiture.
 */
export interface PlayNeeds {
  /** L'enfant doit regarder l'écran (image, lettre, dessin…). */
  looks: boolean;
  /** L'enfant doit bouger (mime, chasse au trésor…). */
  moves: boolean;
  /**
   * Le jeu qui fait bouger a une version sans bouger (chasse au trésor « sans courir ») :
   * c'est elle qui se joue au Coucher et en Voiture.
   */
  still?: boolean;
}

export const ORAL: PlayNeeds = { looks: false, moves: false };
export const ON_SCREEN: PlayNeeds = { looks: true, moves: false };

/** Besoins selon la façon de jouer une carte (type de pack ou de jeu créé). */
export const KIND_NEEDS: Record<PackKind, PlayNeeds> = {
  melody: ORAL,
  sound: ORAL,
  question: ORAL,
  glyph: ON_SCREEN,
  image: ON_SCREEN,
  draw: ON_SCREEN,
};

/** Besoins d'un jeu d'après son type, plus ses propres déclarations (`moves` d'un pack). */
export function needsOf(kind: PackKind, extra: Partial<PlayNeeds> = {}): PlayNeeds {
  return { ...KIND_NEEDS[kind], ...extra };
}

/** Ce jeu ou cette carte convient-il à ce mode ? */
export function suitsMode(needs: PlayNeeds | undefined, mode: GameMode): boolean {
  switch (mode) {
    case 'normal':
    case 'express':
      return true;
    case 'coucher':
      return needs !== undefined && (!needs.moves || !!needs.still);
    case 'voiture':
      return needs !== undefined && !needs.looks && (!needs.moves || !!needs.still);
  }
}

/** Le mode impose-t-il la version sans bouger des jeux qui en ont une (`still`) ? */
export function playsStill(mode: GameMode): boolean {
  return mode === 'coucher' || mode === 'voiture';
}

/** Nombre de manches d'une partie dans ce mode. */
export function modeRounds(rounds: number, mode: GameMode): number {
  return mode === 'express' ? Math.min(rounds, EXPRESS_ROUNDS) : rounds;
}

/** Durée du minuteur de dessin dans ce mode ; 0 : pas de minuteur. */
export function modeDrawSeconds(seconds: number, mode: GameMode): number {
  return mode === 'coucher' ? 0 : seconds;
}

/** Le mode impose-t-il le thème nuit ? */
export function forcesNight(mode: GameMode): boolean {
  return mode === 'coucher';
}

/** Le mode impose-t-il le volume doux ? */
export function forcesSoftVolume(mode: GameMode): boolean {
  return mode === 'coucher';
}

/** Fin de partie en douceur : ni confettis, ni vibration de fête, ni « Un autre jeu ». */
export function gentleEnd(mode: GameMode): boolean {
  return mode === 'coucher';
}
