import { getSettings } from '../data/settings';

/**
 * Vibrations (#31, #146), sur les téléphones qui les permettent (Android : Chrome, Samsung
 * Internet). Elles suivent le réglage « Vibrations » de l'espace Parent ; sans API (iPhone,
 * Firefox), rien ne se passe et l'espace Parent le dit.
 * Jamais pendant que l'enfant dessine : seulement à la validation du parent, à la fin
 * du minuteur (le dessin est alors figé) et à la fin de la partie.
 *
 * Durées : sous ~50 ms, beaucoup de vibreurs ne démarrent pas assez pour être sentis.
 * Chaque impulsion dure donc au moins 80 ms.
 */
export const HAPTICS = {
  /** « Trouvé » : une impulsion nette. */
  found: 80,
  /** Fin du minuteur de « Dessine ça » : deux impulsions. */
  timeUp: [160, 120, 160],
  /** Fin de partie : un petit motif de fête. */
  party: [90, 70, 90, 70, 90, 110, 260],
} as const satisfies Record<string, number | readonly number[]>;

export type Haptic = keyof typeof HAPTICS;

/** Le navigateur sait-il faire vibrer ? (iPhone et Firefox : non.) */
export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Lance la vibration, même réglage coupé ; `false` si le navigateur refuse ou ne sait pas. */
function buzz(kind: Haptic): boolean {
  if (!canVibrate()) return false;
  try {
    const pattern = HAPTICS[kind];
    return navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]) !== false;
  } catch {
    // Navigateur qui refuse (politique de la page) : tant pis.
    return false;
  }
}

/** Vibration du jeu, si le réglage « Vibrations » est sur « Avec ». */
export function vibrate(kind: Haptic): void {
  if (getSettings().vibrations) buzz(kind);
}

/**
 * Essai depuis l'espace Parent, au toucher d'un bouton (Chrome n'accepte de vibrer qu'après un
 * geste sur la page). `false` si le navigateur a refusé.
 */
export function tryVibration(): boolean {
  return buzz('found');
}
