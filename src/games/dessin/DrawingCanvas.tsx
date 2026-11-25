import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

export interface DrawingCanvasHandle {
  clear: () => void;
}

interface Props {
  /** Couleur du crayon (valeur CSS, ex. `var(--forest)`). */
  color: string;
  disabled?: boolean;
  ref?: Ref<DrawingCanvasHandle>;
}

const LINE_WIDTH = 6;

/** Résout une couleur CSS (y compris `var(--x)`) en valeur utilisable par le canvas. */
function resolveColor(el: HTMLElement, color: string): string {
  const m = /^var\((--[\w-]+)\)$/.exec(color);
  if (!m) return color;
  return getComputedStyle(el).getPropertyValue(m[1]).trim() || '#000';
}

/**
 * Zone de dessin au doigt. Un seul doigt à la fois (les autres contacts sont ignorés),
 * le dessin est conservé lors d'un redimensionnement.
 */
export function DrawingCanvas({ color, disabled, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);

  useImperativeHandle(ref, () => ({
    clear() {
      const c = canvasRef.current;
      c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    },
  }));

  // Taille réelle en pixels (écrans haute densité), dessin conservé.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const ratio = window.devicePixelRatio || 1;
      const w = Math.round(c.clientWidth * ratio);
      const h = Math.round(c.clientHeight * ratio);
      if (!w || !h || (w === c.width && h === c.height)) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const copy = c.width && c.height ? ctx.getImageData(0, 0, c.width, c.height) : null;
      c.width = w;
      c.height = h;
      if (copy) ctx.putImageData(copy, 0, 0);
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    };
  }

  function stroke(from: { x: number; y: number }, to: { x: number; y: number }) {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const ratio = c.width / (c.clientWidth || c.width);
    ctx.strokeStyle = resolveColor(c, color);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = LINE_WIDTH * ratio;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
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
        last.current = point(e);
        stroke(last.current, last.current);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pointer.current || !last.current) return;
        if (disabled) return;
        const p = point(e);
        stroke(last.current, p);
        last.current = p;
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== pointer.current) return;
        pointer.current = null;
        last.current = null;
      }}
      onPointerCancel={(e) => {
        if (e.pointerId !== pointer.current) return;
        pointer.current = null;
        last.current = null;
      }}
    />
  );
}
