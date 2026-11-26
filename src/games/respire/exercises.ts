import type { Level } from '../levels';

/**
 * Respire comme… (#126) : de courts exercices de respiration en images, pour redescendre
 * avant le coucher ou après une colère. Le parent fait l'exercice avec l'enfant.
 *
 * Rythme d'enfant, lent : on inspire 3 s, on souffle 4 s, sans jamais retenir son souffle
 * (aucune pause entre les deux). Ni minuteur ni score : l'exercice se termine quand
 * l'animation s'arrête, et l'étoile est gagnée ensemble.
 * Ce module ne contient que des données et des fonctions pures.
 */
export const BREATHE_ID = 'respire';
export const BREATHE_NAME = 'Respire comme…';

export type Phase = 'in' | 'out';

/** Durée de chaque temps, en millisecondes. Pas de temps de rétention : jamais d'apnée. */
export const PHASE_MS: Record<Phase, number> = { in: 3000, out: 4000 };

export interface Exercise {
  id: string;
  name: string;
  /** Image de chaque temps : emoji dessiné par la police du téléphone, aucun fichier. */
  emoji: Record<Phase, string>;
  /** Ce que le parent dit (et que l'écran écrit) à chaque temps. */
  text: Record<Phase, string>;
  /** Couleur de la forme (teinte des tuiles de jeu). */
  tint: 'meadow' | 'sky' | 'dawn';
}

export const EXERCISES: readonly Exercise[] = [
  {
    id: 'vent',
    name: 'Souffle comme le vent',
    emoji: { in: '🍃', out: '🌬️' },
    text: { in: 'On inspire par le nez…', out: '…et on souffle comme le vent : fffff.' },
    tint: 'sky',
  },
  {
    id: 'ours',
    name: 'Respire comme un ours qui dort',
    emoji: { in: '🐻', out: '🐻' },
    text: { in: 'Le ventre de l’ours se gonfle…', out: '…et redescend tout doucement.' },
    tint: 'dawn',
  },
  {
    id: 'ballon',
    name: 'Gonfle un ballon',
    emoji: { in: '🎈', out: '🎈' },
    text: { in: 'Le ventre se gonfle comme un ballon…', out: '…et le ballon se dégonfle.' },
    tint: 'meadow',
  },
  {
    id: 'fleur',
    name: 'Sens la fleur, souffle la bougie',
    emoji: { in: '🌸', out: '🕯️' },
    text: { in: 'On sent la fleur…', out: '…et on souffle la bougie.' },
    tint: 'dawn',
  },
];

export function findExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

/** Durée d'une respiration complète (inspirer puis souffler). */
export const BREATH_MS = PHASE_MS.in + PHASE_MS.out;

/**
 * Nombre de respirations selon l'âge (#40) : un peu plus court pour les petits, toujours
 * entre 1 et 2 minutes. Sans niveau connu : entre les deux.
 */
export const BREATHS: Record<Level, number> = { 1: 9, 2: 12, 3: 15 };
export const DEFAULT_BREATHS = 10;

/** Respirations de l'exercice pour ces niveaux : le plus jeune décide. */
export function breathsFor(levels: readonly Level[]): number {
  return levels.length ? BREATHS[Math.min(...levels) as Level] : DEFAULT_BREATHS;
}

/** Temps de l'exercice, dans l'ordre : inspirer, souffler, inspirer… et on finit en soufflant. */
export function phases(breaths: number): Phase[] {
  return Array.from({ length: breaths * 2 }, (_, i) => (i % 2 ? 'out' : 'in'));
}

/** Durée totale de l'exercice, en millisecondes. */
export function exerciseMs(breaths: number): number {
  return phases(breaths).reduce((sum, p) => sum + PHASE_MS[p], 0);
}
