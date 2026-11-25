import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Theme } from './db';

export async function getTheme(): Promise<Theme> {
  const row = await db.settings.get('theme');
  return (row?.value as Theme | undefined) ?? 'auto';
}

export async function setTheme(theme: Theme): Promise<void> {
  await db.settings.put({ key: 'theme', value: theme });
}

export function useTheme(): Theme {
  return useLiveQuery(getTheme, [], 'auto' as Theme);
}

/** Pose data-theme sur <html> ; les tokens nuit/jour suivent. */
export function useApplyTheme(): void {
  const theme = useTheme();
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'auto') delete el.dataset.theme;
    else el.dataset.theme = theme;
  }, [theme]);
}
