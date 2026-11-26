import { describe, expect, it } from 'vitest';
import { drawPiece, drawWhole, fitView, toDrawing, type Pen, type Point } from './strokes';

function recorder() {
  const ops: string[] = [];
  const pen: Pen = {
    beginPath: () => ops.push('begin'),
    moveTo: (x, y) => ops.push(`move ${x},${y}`),
    lineTo: (x, y) => ops.push(`line ${x},${y}`),
    quadraticCurveTo: (cx, cy, x, y) => ops.push(`curve ${cx},${cy} ${x},${y}`),
    stroke: () => ops.push('stroke'),
  };
  return { ops, pen };
}

describe('fitView', () => {
  it('garde le dessin entier, sans le déformer, centré', () => {
    // Portrait → paysage : réduit de moitié, centré horizontalement.
    expect(fitView({ w: 400, h: 600 }, { w: 800, h: 300 })).toEqual({ scale: 0.5, dx: 300, dy: 0 });
    // Même taille : rien ne bouge.
    expect(fitView({ w: 400, h: 600 }, { w: 400, h: 600 })).toEqual({ scale: 1, dx: 0, dy: 0 });
    // Zone pas encore mesurée.
    expect(fitView({ w: 0, h: 0 }, { w: 400, h: 600 })).toEqual({ scale: 1, dx: 0, dy: 0 });
  });

  it('ramène un point de la zone dans le repère du dessin', () => {
    const view = fitView({ w: 400, h: 600 }, { w: 800, h: 300 });
    expect(toDrawing({ x: 300, y: 0 }, view)).toEqual({ x: 0, y: 0 });
    expect(toDrawing({ x: 500, y: 300 }, view)).toEqual({ x: 400, y: 600 });
  });
});

describe('tracé lissé', () => {
  const pts: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it('un simple appui laisse un point', () => {
    const { ops, pen } = recorder();
    drawWhole(pen, [{ x: 5, y: 5 }]);
    expect(ops).toEqual(['begin', 'move 5,5', 'line 5,5', 'stroke']);
  });

  it('passe par les milieux, en courbes, jusqu’au dernier point', () => {
    const { ops, pen } = recorder();
    drawWhole(pen, pts);
    expect(ops).toEqual([
      ...['begin', 'move 0,0', 'line 0,0', 'stroke'],
      ...['begin', 'move 0,0', 'line 5,0', 'stroke'],
      ...['begin', 'move 5,0', 'curve 10,0 10,5', 'stroke'],
      ...['begin', 'move 10,5', 'line 10,10', 'stroke'],
    ]);
  });

  it('dessiner morceau par morceau donne le même trait que tout redessiner', () => {
    const whole = recorder();
    drawWhole(whole.pen, pts);
    const live = recorder();
    pts.forEach((_, i) => drawPiece(live.pen, pts, i));
    expect(whole.ops.slice(0, live.ops.length)).toEqual(live.ops);
  });
});
