import type { CSSProperties } from 'react';

const COLORS = ['var(--sun)', 'var(--sky)', 'var(--meadow)', 'var(--dawn)', 'var(--ember)'];
const COUNT = 28;

/** Pseudo-hasard fixe (suite de Weyl) : même pluie à chaque rendu, sans état. */
const spread = (i: number, k: number) => ((i + 1) * k * 0.618034) % 1;

const PIECES = Array.from({ length: COUNT }, (_, i) => ({
  '--x': `${(spread(i, 1) * 100).toFixed(1)}vw`,
  '--drift': `${((spread(i, 3) - 0.5) * 30).toFixed(1)}vw`,
  '--turn': `${Math.round(360 + spread(i, 5) * 720)}deg`,
  '--delay': `${Math.round(spread(i, 7) * 600)}ms`,
  '--fall': `${Math.round(2000 + spread(i, 11) * 1200)}ms`,
  background: COLORS[i % COLORS.length],
  borderRadius: i % 3 === 0 ? '50%' : '2px',
})) as CSSProperties[];

/**
 * Pluie de confettis de fin de partie (#32), en CSS, sans bibliothèque.
 * Une seule fois, par-dessus l'écran et sans le bloquer ; rien avec « réduire les animations ».
 */
export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true" data-testid="confetti">
      {PIECES.map((style, i) => (
        <span key={i} className="confetti__piece" style={style} />
      ))}
    </div>
  );
}
