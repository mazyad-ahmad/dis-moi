import { useEffect, useSyncExternalStore } from 'react';
import { db, type Theme } from './db';

export interface Settings {
  theme: Theme;
  /** Nombre de manches par partie. */
  rounds: number;
  /** Durée du minuteur de « Dessine ça », en secondes. */
  drawSeconds: number;
  /** Jeux du catalogue ajoutés à l'accueil. */
  catalogue: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  rounds: 10,
  drawSeconds: 60,
  catalogue: [],
};

export const ROUND_CHOICES = [5, 10, 15] as const;
export const DRAW_SECONDS_CHOICES = [30, 60, 90] as const;

/**
 * Réglages gardés en mémoire et recopiés dans IndexedDB.
 * Lecture synchrone : un jeu connaît son nombre de manches dès le premier rendu.
 */
let current: Settings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();

function emit(next: Settings) {
  current = next;
  listeners.forEach((l) => l());
}

/** Charge les réglages de la base (au démarrage, ou après une remise à zéro). */
export async function loadSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const next: Settings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows)
    if (key in DEFAULT_SETTINGS) (next as unknown as Record<string, unknown>)[key] = value;
  emit(next);
  return next;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  emit({ ...current, [key]: value });
  await db.settings.put({ key, value });
}

export function getSettings(): Settings {
  return current;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings);
}

export function setTheme(theme: Theme): Promise<void> {
  return setSetting('theme', theme);
}

export function useTheme(): Theme {
  return useSettings().theme;
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
