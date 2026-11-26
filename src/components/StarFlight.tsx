import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconStar } from './icons';
import { prefersReducedMotion } from './motion';

/** Compteur d'étoiles de l'en-tête de jeu, cible de l'étoile. */
const TARGET = '.game-header__stars';
/** Taille de l'étoile qui vole, en px. */
const SIZE = 40;
/** Durée du vol, en ms (reward.css). */
export const FLIGHT_MS = 600;
/** Au-delà, les plus anciennes disparaissent : on peut enchaîner vite sans rien accumuler. */
const MAX_FLIGHTS = 3;

interface Flight {
  id: number;
  style: CSSProperties;
}

/**
 * Étoile qui part du bouton « Trouvé » et rejoint le compteur (#32).
 * Purement décorative : elle vole par-dessus l'écran, sans bloquer la manche suivante,
 * et n'est pas créée avec « réduire les animations ».
 */
export function useStarFlight(): { launch: (from: Element | null) => void; stars: ReactNode } {
  const [flights, setFlights] = useState<Flight[]>([]);
  const next = useRef(0);

  const launch = useCallback((from: Element | null) => {
    const target = document.querySelector(TARGET);
    if (!from || !target || prefersReducedMotion()) return;
    const a = from.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const x = a.left + a.width / 2;
    const y = a.top + a.height / 2;
    const style = {
      left: x - SIZE / 2,
      top: y - SIZE / 2,
      '--star-dx': `${b.left + b.width / 2 - x}px`,
      '--star-dy': `${b.top + b.height / 2 - y}px`,
    } as CSSProperties;
    const id = next.current++;
    setFlights((f) => [...f.slice(1 - MAX_FLIGHTS), { id, style }]);
    // Arrivée : l'étoile disparaît (minuterie plutôt qu'animationend, qui peut ne jamais venir).
    setTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), FLIGHT_MS + 50);
  }, []);

  const stars = flights.length
    ? createPortal(
        flights.map(({ id, style }) => (
          <span
            key={id}
            className="star-flight"
            style={style}
            data-testid="star-flight"
            aria-hidden="true"
          >
            <span className="star-flight__lift">
              <IconStar size={SIZE} />
            </span>
          </span>
        )),
        document.body,
      )
    : null;

  return { launch, stars };
}
