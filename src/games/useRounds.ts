import { useCallback, useRef, useState } from 'react';
import { startRecord, updateRecord } from '../data/history';
import { DEFAULT_SETTINGS, getSettings } from '../data/settings';
import { useWakeLock } from '../pwa/useWakeLock';

/** Nombre de manches par défaut (docs/FONCTIONNEMENT.md), réglable dans l'espace Parent. */
export const DEFAULT_ROUNDS = DEFAULT_SETTINGS.rounds;

/** Nombre de manches réglé, figé au lancement de la partie. */
export function useRoundSetting(): number {
  return useState(() => getSettings().rounds)[0];
}

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
export function useRounds(gameId: string, wanted?: number): Rounds {
  const setting = useRoundSetting();
  const rounds = wanted ?? setting;
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

  // L'enfant réfléchit, le parent attend : l'écran ne doit pas s'éteindre en pleine partie.
  useWakeLock(played < rounds);

  return {
    round: Math.min(played + 1, rounds),
    rounds,
    stars,
    finished: played >= rounds,
    answer,
  };
}
