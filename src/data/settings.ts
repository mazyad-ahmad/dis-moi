import { useEffect, useSyncExternalStore } from 'react';
import type { Level } from '../games/levels';
import type { SpeechSpeed } from '../voice/speech';
import { db, type Theme } from './db';

export interface Settings {
  theme: Theme;
  /** Nombre de manches par partie. */
  rounds: number;
  /** Durée du minuteur de « Dessine ça », en secondes. */
  drawSeconds: number;
  /** Jeux du catalogue ajoutés à l'accueil. */
  catalogue: string[];
  /** Date de la dernière sauvegarde complète (« Sauvegarder tout »). */
  lastBackupAt: number | null;
  /** Verrou parent : une opération avant l'espace Parent, les joueurs et les jeux. */
  parentLock: boolean;
  /** Durée d'une séance en minutes, 0 : pas de limite (#120). */
  sessionMinutes: number;
  /** Vibrations légères sur « Trouvé », à la fin du minuteur et de la partie (#31). */
  vibrations: boolean;
  /** Bouton « Lire » des jeux (#35) : vitesse de lecture, ou « off » pour le masquer. */
  readAloud: ReadAloud;
  /** Sons d'interface (étoile, passer, minuteur, fin de partie) (#30). */
  sounds: boolean;
  /** Félicitations parlées au « Trouvé » et en fin de partie (#116). */
  praise: boolean;
  /** Volume de l'appli (#121) : doux par défaut. */
  volume: Volume;
  /** Niveau de la partie en équipe (#40), choisi sur l'accueil ; `null` : tous niveaux. */
  gameLevel: Level | null;
  /** Joueurs qui ne jouent pas aujourd'hui (#37) ; un nouveau joueur joue par défaut. */
  absentPlayers: number[];
}

export type Volume = 'soft' | 'normal';
export const VOLUME_CHOICES = ['soft', 'normal'] as const satisfies readonly Volume[];

export type ReadAloud = 'off' | SpeechSpeed;
export const READ_ALOUD_CHOICES = ['normal', 'slow', 'off'] as const satisfies readonly ReadAloud[];

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  rounds: 10,
  drawSeconds: 60,
  catalogue: [],
  lastBackupAt: null,
  parentLock: false,
  sessionMinutes: 0,
  vibrations: true,
  readAloud: 'normal',
  sounds: true,
  praise: true,
  volume: 'soft',
  gameLevel: null,
  absentPlayers: [],
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
