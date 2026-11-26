import { getSettings } from '../data/settings';

/**
 * Vibrations légères (#31), sur les téléphones qui les permettent (Android).
 * Elles suivent le réglage « Vibrations » de l'espace Parent ; sans API, rien ne se passe.
 * Jamais pendant que l'enfant dessine : seulement à la validation du parent, à la fin
 * du minuteur (le dessin est alors figé) et à la fin de la partie.
 */
export const HAPTICS = {
  /** « Trouvé » : une impulsion courte. */
  found: 40,
  /** Fin du minuteur de « Dessine ça » : deux impulsions. */
  timeUp: [90, 90, 90],
  /** Fin de partie : un petit motif de fête. */
  party: [60, 50, 60, 50, 60, 90, 180],
} as const satisfies Record<string, number | readonly number[]>;

export type Haptic = keyof typeof HAPTICS;

export function vibrate(kind: Haptic): void {
  if (!getSettings().vibrations) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    const pattern = HAPTICS[kind];
    navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
  } catch {
    // Navigateur qui refuse (pas de geste récent, politique de la page) : tant pis.
  }
}
