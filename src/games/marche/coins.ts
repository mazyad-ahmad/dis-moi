import { coinText } from './marche';

/**
 * Pièces en euros dessinées par l'appli (aucune photo de vraie monnaie) : un disque à la
 * couleur du métal et la valeur écrite au centre. Taille relative proche des vraies pièces
 * (la pièce de 10 centimes est la plus petite, celle de 2 € la plus grande). Couleurs fixes,
 * celles du métal : un disque doré ou argenté, chiffres foncés, lisible sur fond clair comme
 * en mode sombre.
 */
const GOLD = '#e0b84d';
const GOLD_EDGE = '#8a6a1c';
const SILVER = '#d3d7dc';
const SILVER_EDGE = '#6d737a';
export const TEXT = '#1f2a24';

/** Rayon de chaque pièce, en unités du dessin (diamètre réel en mm × 1,2). */
const RADIUS: Record<number, number> = { 10: 24, 20: 27, 50: 29, 100: 28, 200: 31 };
const GAP = 6;

interface CoinShape {
  cents: number;
  x: number;
  y: number;
  r: number;
  /** Anneau et cœur : 1 € cœur argenté, 2 € cœur doré ; centimes tout dorés. */
  ring: string;
  core: string;
  edge: string;
  label: string;
}

const ROW = 2 * 31 + GAP;

/** Les pièces côte à côte, `perRow` au plus par ligne, chaque ligne centrée. */
export function coinShapes(
  coins: readonly number[],
  perRow = coins.length,
): { shapes: CoinShape[]; width: number; height: number } {
  const rows: number[][] = [];
  for (let i = 0; i < coins.length; i += Math.max(1, perRow))
    rows.push(coins.slice(i, i + Math.max(1, perRow)));
  const rowWidth = (row: number[]) =>
    row.reduce((w, cents) => w + 2 * (RADIUS[cents] ?? 26) + GAP, GAP);
  const width = Math.max(1, ...rows.map(rowWidth));
  const shapes = rows.flatMap((row, j) => {
    let x = (width - rowWidth(row)) / 2 + GAP;
    return row.map((cents): CoinShape => {
      const r = RADIUS[cents] ?? 26;
      const shape = {
        cents,
        x: x + r,
        y: GAP / 2 + j * ROW + ROW / 2,
        r,
        ring: cents === 200 ? SILVER : GOLD,
        core: cents === 100 ? SILVER : GOLD,
        edge: cents === 200 ? SILVER_EDGE : GOLD_EDGE,
        label: coinText(cents),
      };
      x += 2 * r + GAP;
      return shape;
    });
  });
  return { shapes, width, height: rows.length * ROW + GAP };
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** La même rangée en texte SVG, pour une image de choix « en montrant ». */
export function coinsSvg(coins: readonly number[], perRow = 3): string {
  const { shapes, width, height } = coinShapes(coins, perRow);
  const body = shapes
    .map(
      (s) =>
        `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.ring}" stroke="${s.edge}" stroke-width="2"/>` +
        `<circle cx="${s.x}" cy="${s.y}" r="${s.r * 0.7}" fill="${s.core}"/>` +
        `<text x="${s.x}" y="${s.y}" text-anchor="middle" dominant-baseline="central" fill="${TEXT}" font-size="${s.r * 0.62}" font-weight="700" font-family="system-ui, sans-serif">${escape(s.label)}</text>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`;
}
