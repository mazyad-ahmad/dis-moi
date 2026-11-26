import { useCallback, useRef, useState } from 'react';
import { startRecord, updateRecord } from '../data/history';
import { beginGame, endGame, touch } from '../data/seance';
import { DEFAULT_SETTINGS, getSettings } from '../data/settings';
import { useWakeLock } from '../pwa/useWakeLock';
import { clearSaved, readSaved, useClearSavedOnLeave, useSaved, writeSaved } from './session';

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

interface Progress {
  played: number;
  stars: number;
}

function restoreProgress(saved: unknown): Progress | undefined {
  const p = saved as Partial<Progress> | null;
  const ok = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;
  return p && ok(p.played) && ok(p.stars) && p.stars <= p.played
    ? ({ ...p } as Progress)
    : undefined;
}

/**
 * Déroulé commun des jeux : manches, étoiles, fin de partie.
 * La partie est enregistrée dès la première manche puis mise à jour,
 * pour garder les étoiles même si on quitte en cours de route.
 * Elle est aussi gardée pour l'onglet (`session.ts`) : un rafraîchissement la reprend
 * là où elle en était, sans créer de doublon dans l'historique.
 */
export function useRounds(gameId: string, wanted?: number): Rounds {
  const setting = useRoundSetting();
  const rounds = wanted ?? setting;
  // Fin de séance (#120) : une partie neuve compte ; une partie reprise, déjà comptée.
  useState(() => {
    if (readSaved(gameId, 'progress') === undefined) beginGame();
  });
  const [progress, setProgress] = useSaved<Progress>(
    gameId,
    'progress',
    () => ({ played: 0, stars: 0 }),
    restoreProgress,
  );
  const { played, stars } = progress;
  // Partie reprise après un rafraîchissement : on continue son enregistrement.
  const [resumed] = useState(() => {
    const id = readSaved(gameId, 'record');
    return Number.isInteger(id) ? Promise.resolve(id as number) : null;
  });
  const record = useRef<Promise<number> | null>(resumed);
  useClearSavedOnLeave(gameId);

  const answer = useCallback(
    (found: boolean) => {
      if (played >= rounds) return;
      const data = { played: played + 1, stars: stars + (found ? 1 : 0) };
      setProgress(data);
      if (data.played >= rounds) {
        clearSaved(gameId);
        endGame();
      } else touch();
      if (!record.current) {
        record.current = startRecord({ gameId, rounds, ...data });
        void record.current.then((id) => writeSaved(gameId, 'record', id, true));
      } else void record.current.then((id) => updateRecord(id, data));
    },
    [gameId, played, rounds, setProgress, stars],
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
