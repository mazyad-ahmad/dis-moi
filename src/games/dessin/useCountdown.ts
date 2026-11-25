import { useEffect, useState } from 'react';

/**
 * Compte à rebours en secondes. Repart de `seconds` quand `resetKey` change.
 * Se met en pause quand la page est masquée (écran verrouillé, autre appli).
 */
export function useCountdown(seconds: number, resetKey: unknown): number {
  const [state, setState] = useState({ key: resetKey, left: seconds });
  // Réinitialisation pendant le rendu (pas d'effet en cascade).
  if (state.key !== resetKey) setState({ key: resetKey, left: seconds });
  const left = state.key === resetKey ? state.left : seconds;

  const done = left <= 0;
  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      setState((s) => ({ ...s, left: Math.max(0, s.left - 1) }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [done, resetKey]);

  return left;
}
