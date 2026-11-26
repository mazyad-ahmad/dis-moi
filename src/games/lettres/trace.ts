import type { GlyphCard } from './bank';

/**
 * Modèles de tracé (#49) : chaque majuscule et chaque chiffre est une suite de traits, dans
 * l'ordre où on les écrit à l'école (de haut en bas, de gauche à droite, le rond dans le sens
 * inverse des aiguilles d'une montre). Dessinés pour l'appli, dans un carré de 100 : aucun
 * fichier, aucun droit tiers. Chaque trait est un chemin SVG en coordonnées absolues
 * (M, L, C, Q seulement) : son premier point est le point de départ.
 */
const T = 10; // haut
const B = 90; // bas

export const TRACES: Readonly<Record<string, readonly string[]>> = {
  A: [`M50 ${T} L20 ${B}`, `M50 ${T} L80 ${B}`, 'M32 62 L68 62'],
  B: [`M25 ${T} L25 ${B}`, `M25 ${T} L52 ${T} C76 10 76 50 52 50 C80 50 80 90 52 90 L25 ${B}`],
  C: ['M78 25 C68 6 20 6 20 50 C20 94 68 94 78 75'],
  D: [`M25 ${T} L25 ${B}`, `M25 ${T} L45 ${T} C88 10 88 90 45 90 L25 ${B}`],
  E: [`M25 ${T} L25 ${B}`, `M25 ${T} L75 ${T}`, 'M25 50 L65 50', `M25 ${B} L75 ${B}`],
  F: [`M25 ${T} L25 ${B}`, `M25 ${T} L75 ${T}`, 'M25 50 L65 50'],
  G: ['M78 25 C68 6 20 6 20 50 C20 94 78 96 78 56 L56 56'],
  H: [`M25 ${T} L25 ${B}`, `M75 ${T} L75 ${B}`, 'M25 50 L75 50'],
  I: [`M50 ${T} L50 ${B}`],
  J: [`M65 ${T} L65 66 C65 96 25 96 25 70`],
  K: [`M25 ${T} L25 ${B}`, `M75 ${T} L27 54 L75 ${B}`],
  L: [`M25 ${T} L25 ${B} L75 ${B}`],
  M: [`M20 ${B} L20 ${T} L50 60 L80 ${T} L80 ${B}`],
  N: [`M25 ${B} L25 ${T} L75 ${B} L75 ${T}`],
  O: [`M50 ${T} C14 10 14 90 50 90 C86 90 86 10 50 ${T}`],
  P: [`M25 ${T} L25 ${B}`, `M25 ${T} L52 ${T} C80 10 80 52 52 52 L25 52`],
  Q: [`M50 ${T} C14 10 14 90 50 90 C86 90 86 10 50 ${T}`, 'M58 68 L82 94'],
  R: [`M25 ${T} L25 ${B}`, `M25 ${T} L52 ${T} C80 10 80 52 52 52 L25 52`, `M48 52 L78 ${B}`],
  S: ['M76 24 C70 6 24 4 24 30 C24 54 76 46 76 70 C76 98 28 98 22 78'],
  T: [`M20 ${T} L80 ${T}`, `M50 ${T} L50 ${B}`],
  U: [`M25 ${T} L25 62 C25 96 75 96 75 62 L75 ${T}`],
  V: [`M20 ${T} L50 ${B} L80 ${T}`],
  W: [`M14 ${T} L32 ${B} L50 34 L68 ${B} L86 ${T}`],
  X: [`M25 ${T} L75 ${B}`, `M75 ${T} L25 ${B}`],
  Y: [`M25 ${T} L50 50`, `M75 ${T} L50 50 L50 ${B}`],
  Z: [`M25 ${T} L75 ${T} L25 ${B} L75 ${B}`],
  '0': [`M50 ${T} C18 10 18 90 50 90 C82 90 82 10 50 ${T}`],
  '1': [`M32 30 L55 ${T} L55 ${B}`],
  '2': [`M25 30 C25 4 75 4 75 30 C75 50 40 64 25 ${B} L78 ${B}`],
  '3': ['M27 22 C38 2 76 4 76 28 C76 44 62 50 46 50 C64 50 78 56 78 72 C78 96 36 98 25 80'],
  '4': [`M60 ${T} L22 64 L80 64`, `M62 38 L62 ${B}`],
  '5': [`M32 ${T} L28 46 C44 36 76 38 76 66 C76 96 32 96 24 78`, `M32 ${T} L72 ${T}`],
  '6': ['M70 14 C42 2 22 28 22 60 C22 92 76 94 76 64 C76 38 30 38 24 58'],
  '7': [`M24 ${T} L76 ${T} L40 ${B}`],
  '8': [`M50 ${T} C24 10 24 48 50 50 C78 52 78 90 50 90 C22 90 22 52 50 50 C76 48 76 10 50 ${T}`],
  '9': ['M76 30 C70 4 24 6 24 34 C24 62 76 60 76 30 L76 62 C76 94 40 94 28 82'],
};

/** Le tracé existe pour les majuscules et les chiffres. */
export function traceOf(card: Pick<GlyphCard, 'set' | 'glyph'>): readonly string[] | undefined {
  if (card.set !== 'upper' && card.set !== 'digit') return undefined;
  return TRACES[card.glyph];
}

export interface Point {
  x: number;
  y: number;
}

/** Nombres du chemin, dans l'ordre (les lettres de commande sont ignorées). */
export function pathNumbers(d: string): number[] {
  return (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
}

/**
 * Point de départ d'un trait et sens du tracé (vecteur unitaire) : vers le premier point
 * qui suit (fin d'une ligne, ou premier point de contrôle d'une courbe, qui en donne la
 * tangente).
 */
export function strokeStart(d: string): { start: Point; dir: Point } {
  const [x, y, ...rest] = pathNumbers(d);
  const start = { x, y };
  for (let i = 0; i + 1 < rest.length; i += 2) {
    const dx = rest[i] - x;
    const dy = rest[i + 1] - y;
    const len = Math.hypot(dx, dy);
    if (len > 0) return { start, dir: { x: dx / len, y: dy / len } };
  }
  return { start, dir: { x: 1, y: 0 } };
}

export interface StrokeMarker {
  /** Numéro du trait (1, 2…). */
  n: number;
  start: Point;
  /** Pastille du numéro : juste avant le départ, à l'opposé du sens du tracé. */
  badge: Point;
  /** Flèche : juste après le départ, dans le sens du tracé. */
  arrow: Point;
  /** Angle de la flèche, en degrés (0 = vers la droite). */
  angle: number;
}

const BADGE_GAP = 14;
const ARROW_GAP = 15;

/**
 * Repères de chaque trait : point de départ, numéro et flèche. Deux traits qui partent du
 * même point (le A, le E…) partent dans des sens différents : leurs numéros ne se
 * chevauchent pas.
 */
export function strokeMarkers(strokes: readonly string[]): StrokeMarker[] {
  return strokes.map((d, i) => {
    const { start, dir } = strokeStart(d);
    return {
      n: i + 1,
      start,
      badge: { x: start.x - dir.x * BADGE_GAP, y: start.y - dir.y * BADGE_GAP },
      arrow: { x: start.x + dir.x * ARROW_GAP, y: start.y + dir.y * ARROW_GAP },
      angle: (Math.atan2(dir.y, dir.x) * 180) / Math.PI,
    };
  });
}
