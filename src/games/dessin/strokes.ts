/**
 * Dessin gardé en mémoire (#51) : la liste des traits, redessinée à la demande
 * (annuler, rotation, redimensionnement). Fonctions pures, sans DOM.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  /** Points du trait, dans le repère du dessin (pixels CSS de la zone à son premier trait). */
  points: Point[];
  /** Couleur CSS (ex. `var(--forest)`), résolue au moment de dessiner. */
  color: string;
  /** Épaisseur, dans le repère du dessin. */
  width: number;
  /** Gomme : le trait efface au lieu de peindre. */
  erase: boolean;
}

export interface Size {
  w: number;
  h: number;
}

/** Place le repère du dessin dans la zone : agrandi ou réduit sans déformer, centré. */
export interface View {
  scale: number;
  dx: number;
  dy: number;
}

/**
 * Le dessin (fait dans une zone de taille `ref`) tient en entier dans la zone actuelle :
 * même échelle sur les deux axes (rien n'est étiré), centré. Après une rotation, il est
 * réduit au lieu d'être coupé ; au retour, il reprend sa taille.
 */
export function fitView(ref: Size, area: Size): View {
  if (!ref.w || !ref.h || !area.w || !area.h) return { scale: 1, dx: 0, dy: 0 };
  const scale = Math.min(area.w / ref.w, area.h / ref.h);
  return { scale, dx: (area.w - ref.w * scale) / 2, dy: (area.h - ref.h * scale) / 2 };
}

/** Point de la zone (pixels CSS) → point du repère du dessin. */
export function toDrawing(p: Point, view: View): Point {
  return { x: (p.x - view.dx) / view.scale, y: (p.y - view.dy) / view.scale };
}

/** Le minimum de l'API canvas dont le tracé a besoin (testable sans navigateur). */
export interface Pen {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  stroke(): void;
}

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Trace le morceau de trait apporté par le point `i` : un point au départ, puis des courbes
 * qui passent par les milieux des points successifs (tracé lissé). Dessiner les morceaux un
 * à un pendant que le doigt bouge donne exactement le même trait que tout redessiner.
 */
export function drawPiece(pen: Pen, points: readonly Point[], i: number) {
  const p = points[i];
  if (!p) return;
  pen.beginPath();
  if (i === 0) {
    pen.moveTo(p.x, p.y);
    pen.lineTo(p.x, p.y);
  } else if (i === 1) {
    const m = mid(points[0], p);
    pen.moveTo(points[0].x, points[0].y);
    pen.lineTo(m.x, m.y);
  } else {
    const a = mid(points[i - 2], points[i - 1]);
    const b = mid(points[i - 1], p);
    pen.moveTo(a.x, a.y);
    pen.quadraticCurveTo(points[i - 1].x, points[i - 1].y, b.x, b.y);
  }
  pen.stroke();
}

/** Fin du trait, quand le doigt se lève : du dernier milieu jusqu'au dernier point. */
export function drawTail(pen: Pen, points: readonly Point[]) {
  const n = points.length;
  if (n < 2) return;
  const m = mid(points[n - 2], points[n - 1]);
  pen.beginPath();
  pen.moveTo(m.x, m.y);
  pen.lineTo(points[n - 1].x, points[n - 1].y);
  pen.stroke();
}

/** Trait complet (redessin après annuler ou redimensionnement). */
export function drawWhole(pen: Pen, points: readonly Point[]) {
  for (let i = 0; i < points.length; i++) drawPiece(pen, points, i);
  drawTail(pen, points);
}
