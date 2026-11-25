import { useEffect } from 'react';

/**
 * Garde l'écran allumé tant que `active` est vrai (pendant une partie).
 * Le verrou est perdu quand l'appli passe en arrière-plan : on le reprend au retour.
 * Sans Wake Lock API (ou refus), rien ne se passe.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        // Batterie faible, page cachée… : l'écran se mettra en veille normalement.
      }
    };
    const onVisible = () => void acquire();

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
