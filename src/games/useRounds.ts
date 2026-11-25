import { useCallback, useRef, useState } from 'react';
import { startRecord, updateRecord } from '../data/history';

/** Nombre de manches par partie (docs/FONCTIONNEMENT.md). Réglable plus tard (#12). */
export const DEFAULT_ROUNDS = 10;

export interface Rounds {
  /** Manche en cours, à partir de 1. */
  round: number;
  rounds: number;
  stars: number;
  finished: boolean;
  /** Trouvé (+1 étoile) ou Passer / Pas encore (0). */
  answer: (found: boolean) => void;
}

/**
 * Déroulé commun des jeux : manches, étoiles, fin de partie.
 * La partie est enregistrée dès la première manche puis mise à jour,
 * pour garder les étoiles même si on quitte en cours de route.
 */
export function useRounds(gameId: string, rounds = DEFAULT_ROUNDS): Rounds {
  const [played, setPlayed] = useState(0);
  const [stars, setStars] = useState(0);
  const record = useRef<Promise<number> | null>(null);

  const answer = useCallback(
    (found: boolean) => {
      const nextPlayed = Math.min(played + 1, rounds);
      const nextStars = stars + (found ? 1 : 0);
      if (played >= rounds) return;
      setPlayed(nextPlayed);
      setStars(nextStars);
      const data = { played: nextPlayed, stars: nextStars };
      if (!record.current) record.current = startRecord({ gameId, rounds, ...data });
      else void record.current.then((id) => updateRecord(id, data));
    },
    [gameId, played, rounds, stars],
  );

  return {
    round: Math.min(played + 1, rounds),
    rounds,
    stars,
    finished: played >= rounds,
    answer,
  };
}
