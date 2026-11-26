import { useSyncExternalStore } from 'react';
import { useTheme } from '../data/settings';

const DARK = '(prefers-color-scheme: dark)';

function subscribeDark(cb: () => void) {
  const query = window.matchMedia?.(DARK);
  query?.addEventListener?.('change', cb);
  return () => query?.removeEventListener?.('change', cb);
}

const systemIsDark = () => window.matchMedia?.(DARK).matches ?? false;

/** Thème nuit affiché : choisi par le parent, ou suivi du téléphone en « auto ». */
export function useNightTheme(): boolean {
  const theme = useTheme();
  const dark = useSyncExternalStore(subscribeDark, systemIsDark);
  return theme === 'night' || (theme === 'auto' && dark);
}
