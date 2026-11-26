import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';

/** Délai après lequel une lecture restée sans réponse est relancée. */
export const RETRY_AFTER_MS = 2000;

/**
 * `useLiveQuery`, avec un nouvel essai si la base ne répond pas.
 * Dexie abandonne une requête en direct, sans erreur et sans nouvel essai, quand sa lecture est
 * interrompue (`AbortError`, `DatabaseClosedError` : onglet gelé par Android, base refermée…) :
 * l'écran restait alors bloqué sur « lecture en cours » (onglet Étoiles vide, #143).
 * Tant qu'aucune réponse n'est arrivée, on se réabonne : nouvelle lecture.
 */
export function useLiveRead<T>(
  querier: () => Promise<T>,
  deps: unknown[],
  retryAfter = RETRY_AFTER_MS,
): T | undefined {
  const [attempt, setAttempt] = useState(0);
  const value = useLiveQuery(querier, [...deps, attempt]);
  useEffect(() => {
    if (value !== undefined) return;
    const timer = setTimeout(() => setAttempt((a) => a + 1), retryAfter);
    return () => clearTimeout(timer);
  }, [value, attempt, retryAfter]);
  return value;
}
