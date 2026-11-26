import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import {
  drawPiece,
  drawTail,
  drawWhole,
  fitView,
  toDrawing,
  type Point,
  type Size,
  type Stroke,
} from './strokes';
import { canvasToPng } from './snapshot';

export interface DrawingCanvasHandle {
  clear: () => void;
  /** Retire le dernier trait. */
  undo: () => void;
  /** Image PNG du dessin tel qu'il est à l'écran (#52) ; `null` s'il est vide. */
  snapshot: () => Promise<Blob | null>;
}

interface Props {
  /** Couleur du crayon (valeur CSS, ex. `var(--forest)`). */
  color: string;
  /** Épaisseur du trait, en pixels CSS. */
  width: number;
  /** Gomme : le doigt efface. */
  erase?: boolean;
  disabled?: boolean;
  /** Nombre de traits, à chaque changement (pour griser « Annuler »). */
  onCount?: (count: number) => void;
  ref?: Ref<DrawingCanvasHandle>;
}

/** Résout une couleur CSS (y compris `var(--x)`) en valeur utilisable par le canvas. */
function resolveColor(el: HTMLElement, color: string): string {
  const m = /^var\((--[\w-]+)\)$/.exec(color);
  if (!m) return color;
  return getComputedStyle(el).getPropertyValue(m[1]).trim() || '#000';
}

const area = (c: HTMLCanvasElement): Size => ({ w: c.clientWidth, h: c.clientHeight });

/**
 * Zone de dessin au doigt. Un seul doigt à la fois (les autres contacts sont ignorés).
 * Les traits sont gardés en liste et redessinés à la demande : « Annuler », rotation et
 * redimensionnement restent nets (#51).
 */
export function DrawingCanvas({ color, width, erase = false, disabled, onCount, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const strokes = useRef<Stroke[]>([]);
  // Taille de la zone (pixels CSS) au premier trait : le repère du dessin.
  const frame = useRef<Size | null>(null);
  const drawing = useRef<Stroke | null>(null);

  const view = (c: HTMLCanvasElement) => fitView(frame.current ?? area(c), area(c));

  /** Prépare le pinceau pour un trait, dans le repère du dessin, puis trace. */
  function paint(stroke: Stroke, trace: (ctx: CanvasRenderingContext2D) => void) {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const ratio = c.width / (c.clientWidth || c.width || 1);
    const v = view(c);
    ctx.setTransform(ratio * v.scale, 0, 0, ratio * v.scale, ratio * v.dx, ratio * v.dy);
    ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.erase ? '#000' : resolveColor(c, stroke.color);
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    trace(ctx);
  }

  function redraw() {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, c.width, c.height);
    for (const s of strokes.current) paint(s, (ctx) => drawWhole(ctx, s.points));
  }
  // Le dernier redessin, pour l'observateur de taille créé une seule fois.
  const redrawRef = useRef(redraw);
  useEffect(() => {
    redrawRef.current = redraw;
  });

  function changed() {
    drawing.current = null;
    pointer.current = null;
    if (!strokes.current.length) frame.current = null;
    onCount?.(strokes.current.length);
    redraw();
  }

  useImperativeHandle(ref, () => ({
    clear() {
      strokes.current = [];
      changed();
    },
    undo() {
      if (!strokes.current.length) return;
      strokes.current.pop();
      changed();
    },
    snapshot() {
      const c = canvasRef.current;
      return c && strokes.current.length ? canvasToPng(c) : Promise.resolve(null);
    },
  }));

  // Taille réelle en pixels (écrans haute densité) ; le dessin est retracé à la nouvelle
  // taille, net, au lieu d'être étiré.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const ratio = window.devicePixelRatio || 1;
      const w = Math.round(c.clientWidth * ratio);
      const h = Math.round(c.clientHeight * ratio);
      if (!w || !h || (w === c.width && h === c.height)) return;
      c.width = w;
      c.height = h;
      redrawRef.current();
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    const sx = r.width ? c.clientWidth / r.width : 1;
    const sy = r.height ? c.clientHeight / r.height : 1;
    return toDrawing({ x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }, view(c));
  }

  function end(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerId !== pointer.current) return;
    const s = drawing.current;
    if (s) paint(s, (ctx) => drawTail(ctx, s.points));
    pointer.current = null;
    drawing.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="drawing-canvas"
      aria-label="Zone de dessin"
      onPointerDown={(e) => {
        if (disabled || pointer.current !== null) return;
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const c = e.currentTarget;
        if (!strokes.current.length) frame.current = area(c);
        const s: Stroke = { points: [point(e)], color, width: width / view(c).scale, erase };
        strokes.current.push(s);
        drawing.current = s;
        paint(s, (ctx) => drawPiece(ctx, s.points, 0));
        onCount?.(strokes.current.length);
      }}
      onPointerMove={(e) => {
        const s = drawing.current;
        if (e.pointerId !== pointer.current || !s || disabled) return;
        const p = point(e);
        const last = s.points[s.points.length - 1];
        if (p.x === last.x && p.y === last.y) return;
        s.points.push(p);
        paint(s, (ctx) => drawPiece(ctx, s.points, s.points.length - 1));
      }}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
}
